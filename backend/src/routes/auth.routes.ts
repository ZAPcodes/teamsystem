import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  LoginRequestSchema,
  LoginResponseSchema,
  MeResponseSchema,
  PublicCompaniesQuerySchema,
  PublicCompaniesResponseSchema,
  SignupCompanyRequestSchema,
  SignupEmployeeRequestSchema,
  type SignupCompanyRequest,
  type SignupEmployeeRequest
} from "../../contracts/api.js";
import { createSessionToken, hashToken } from "../auth/tokens.js";
import { ApiError } from "../http/ApiError.js";
import { asyncHandler } from "../http/asyncHandler.js";
import { respond } from "../http/respond.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { Company } from "../models/Company.js";
import { EmployeeAllowance } from "../models/EmployeeAllowance.js";
import { EmployerPolicy } from "../models/EmployerPolicy.js";
import { Provider } from "../models/Provider.js";
import { User } from "../models/User.js";
import { fundCompanyWallet } from "../services/ledger.service.js";
import { toUserDTO } from "../mappers/user.mapper.js";
import { initialsForName } from "../utils/identity.js";
import { nextPeriodReset } from "../utils/period.js";

export const authRouter = Router();
type LoginRequest = z.infer<typeof LoginRequestSchema>;

function rolesForCompanySignup(roles: SignupCompanyRequest["roles"]) {
  const userRoles: Array<"employer_admin" | "provider_admin"> = [];
  if (roles.includes("employer")) userRoles.push("employer_admin");
  if (roles.includes("provider")) userRoles.push("provider_admin");
  return userRoles;
}

async function issueSession(user: InstanceType<typeof User>) {
  const token = createSessionToken();
  user.sessionTokens.push({
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    createdAt: new Date()
  });
  await user.save();

  return {
    token,
    user: toUserDTO(user.toObject())
  };
}

authRouter.get(
  "/companies",
  asyncHandler(async (req, res) => {
    PublicCompaniesQuerySchema.parse(req.query);
    const companies = await Company.find({ employerProfile: { $exists: true } })
      .sort({ name: 1 })
      .lean();

    respond(res, PublicCompaniesResponseSchema, {
      companies: companies.map((company) => ({
        id: String(company._id),
        name: company.name,
        logoUrl: company.providerProfile?.logoUrl ?? undefined
      }))
    });
  })
);

authRouter.post(
  "/signup/company",
  validateBody(SignupCompanyRequestSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as SignupCompanyRequest;
    const email = body.admin.email.toLowerCase();

    if (await User.exists({ email })) {
      throw new ApiError(409, "EMAIL_TAKEN", "Email is already registered");
    }

    if (body.roles.includes("employer") && !body.employerPolicy) {
      throw new ApiError(400, "MISSING_EMPLOYER_POLICY", "Employer signup requires employerPolicy");
    }

    if (body.roles.includes("provider") && !body.providerProfile) {
      throw new ApiError(400, "MISSING_PROVIDER_PROFILE", "Provider signup requires providerProfile");
    }

    const company = await Company.create({
      name: body.companyName,
      country: body.country,
      currency: body.currency,
      locale: body.locale,
      walletBalance: 0,
      employerProfile: body.roles.includes("employer")
        ? { displayName: body.companyName }
        : undefined,
      providerProfile: body.roles.includes("provider") && body.providerProfile
        ? {
            displayName: body.companyName,
            categories: [body.providerProfile.category],
            description: body.providerProfile.description,
            logoUrl: body.providerProfile.logoUrl
          }
        : undefined
    });

    if (body.roles.includes("employer") && body.employerPolicy) {
      await EmployerPolicy.create({
        companyId: company._id,
        perEmployeeAllowance: body.employerPolicy.perEmployeeAllowance,
        resetPeriod: body.employerPolicy.resetPeriod,
        allowedCategories: body.employerPolicy.allowedCategories,
        autoApproveThreshold: 9_999_999,
        currency: body.currency
      });

      const initialFloat = Math.max(body.employerPolicy.perEmployeeAllowance * 25, 500_000);
      await fundCompanyWallet(company._id.toString(), initialFloat, body.currency);
    }

    if (body.roles.includes("provider") && body.providerProfile) {
      await Provider.create({
        companyId: company._id,
        name: body.companyName,
        category: body.providerProfile.category,
        country: body.country,
        logoUrl: body.providerProfile.logoUrl,
        description: body.providerProfile.description
      });
    }

    const passwordHash = await bcrypt.hash(body.admin.password, 10);
    const user = await User.create({
      name: body.admin.name,
      email,
      passwordHash,
      initials: initialsForName(body.admin.name),
      locale: body.locale,
      preferences: [],
      roles: rolesForCompanySignup(body.roles),
      companyId: company._id
    });

    respond(res, LoginResponseSchema, await issueSession(user), 201);
  })
);

authRouter.post(
  "/signup/employee",
  validateBody(SignupEmployeeRequestSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as SignupEmployeeRequest;
    const email = body.email.toLowerCase();

    if (await User.exists({ email })) {
      throw new ApiError(409, "EMAIL_TAKEN", "Email is already registered");
    }

    const company = await Company.findById(body.companyId);
    if (!company) {
      throw new ApiError(404, "COMPANY_NOT_FOUND", "Company not found");
    }

    if (!company.employerProfile) {
      throw new ApiError(400, "COMPANY_NOT_EMPLOYER", "Company is not an employer");
    }

    const policy = await EmployerPolicy.findOne({ companyId: company._id });
    if (!policy) {
      throw new ApiError(400, "COMPANY_NOT_EMPLOYER", "Company has no employer policy");
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await User.create({
      name: body.name,
      email,
      passwordHash,
      initials: initialsForName(body.name),
      locale: company.locale,
      preferences: [],
      roles: ["employee"],
      companyId: company._id
    });

    await EmployeeAllowance.create({
      userId: user._id,
      companyId: company._id,
      total: policy.perEmployeeAllowance,
      used: 0,
      held: 0,
      currency: policy.currency,
      periodResetAt: nextPeriodReset(policy.resetPeriod)
    });

    respond(res, LoginResponseSchema, await issueSession(user), 201);
  })
);

authRouter.post(
  "/login",
  validateBody(LoginRequestSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as LoginRequest;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    respond(res, LoginResponseSchema, await issueSession(user));
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user?.id);
    if (!user) {
      throw new ApiError(401, "UNAUTHORIZED", "User no longer exists");
    }

    respond(res, MeResponseSchema, {
      user: toUserDTO(user.toObject())
    });
  })
);
