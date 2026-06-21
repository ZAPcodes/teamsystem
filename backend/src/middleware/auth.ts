import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../http/ApiError.js";
import { User } from "../models/User.js";
import { hashToken } from "../auth/tokens.js";

export type AuthRole = "employee" | "employer_admin" | "provider_admin";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        companyId: string;
        roles: AuthRole[];
      };
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

  if (!token) {
    next(new ApiError(401, "UNAUTHORIZED", "Missing bearer token"));
    return;
  }

  const tokenHash = hashToken(token);
  const now = new Date();
  const user = await User.findOne({
    "sessionTokens.tokenHash": tokenHash,
    "sessionTokens.expiresAt": { $gt: now }
  }).lean();

  if (!user) {
    next(new ApiError(401, "UNAUTHORIZED", "Invalid or expired token"));
    return;
  }

  req.user = {
    id: user._id.toString(),
    companyId: user.companyId.toString(),
    roles: user.roles as AuthRole[]
  };
  next();
}

export function requireRole(role: AuthRole) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new ApiError(401, "UNAUTHORIZED", "Missing bearer token"));
      return;
    }

    if (!req.user.roles.includes(role)) {
      next(new ApiError(403, "FORBIDDEN", `Requires ${role} role`));
      return;
    }

    next();
  };
}
