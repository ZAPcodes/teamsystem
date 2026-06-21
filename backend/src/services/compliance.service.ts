import type { ClaimComplianceResponseSchema } from "../../contracts/api.js";
import { z } from "zod";
import { env } from "../config/env.js";
import { ApiError } from "../http/ApiError.js";
import { Company } from "../models/Company.js";
import { ComplianceReview } from "../models/ComplianceReview.js";
import { Notification } from "../models/Notification.js";
import { Offer } from "../models/Offer.js";
import { Provider } from "../models/Provider.js";
import { User } from "../models/User.js";

type ClaimComplianceResponse = z.infer<typeof ClaimComplianceResponseSchema>;

const TELECOM_KEYWORDS = /\b(telecom|telecommunications|mobile|carrier|5g|vodafone|albtelecom|one albania)\b/i;

function normalizeIndustry(industry: string) {
  return industry.trim().toLowerCase();
}

function isTelecomSector(industry: string, name: string) {
  return TELECOM_KEYWORDS.test(`${industry} ${name}`);
}

function extractJson<T>(text: string): T | null {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

async function callGroqJson<T>(system: string, user: string): Promise<T | null> {
  if (!env.GROQ_API_KEY) return null;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: env.GROQ_MODEL,
      temperature: 0.1,
      max_tokens: 400,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    })
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  return extractJson<T>(text);
}

function demoCompetitorCheck(employerName: string, employerIndustry: string, providerName: string, providerIndustry: string) {
  const sameTelecom =
    isTelecomSector(employerIndustry, employerName) && isTelecomSector(providerIndustry, providerName);
  const differentBrand = normalizeIndustry(employerName) !== normalizeIndustry(providerName);

  if (sameTelecom && differentBrand) {
    return {
      flagged: true,
      reason: `${providerName} is flagged as a direct competitor in the ${providerIndustry || "Telecommunications"} sector.`
    };
  }

  return { flagged: false, reason: "" };
}

async function checkCompetitorFlag(input: {
  employerName: string;
  employerIndustry: string;
  providerName: string;
  providerIndustry: string;
}) {
  const demo = demoCompetitorCheck(
    input.employerName,
    input.employerIndustry,
    input.providerName,
    input.providerIndustry
  );
  if (demo.flagged) return demo;

  const llm = await callGroqJson<{ isCompetitor?: boolean; reason?: string }>(
    `You are a corporate compliance analyst for Albania. Return ONLY JSON: {"isCompetitor":boolean,"reason":"short phrase"}. Mark true only for direct market competitors in the same industry.`,
    `Employer: ${input.employerName} (${input.employerIndustry})\nProvider: ${input.providerName} (${input.providerIndustry})\nAre they direct market competitors in Albania?`
  );

  if (llm?.isCompetitor) {
    return {
      flagged: true,
      reason:
        llm.reason?.trim() ||
        `${input.providerName} is flagged as a direct competitor in the ${input.providerIndustry} sector.`
    };
  }

  return { flagged: false, reason: "" };
}

function fetchDemoHeadlines(providerName: string, demoSentiment: boolean) {
  if (!demoSentiment) return [];

  return [
    `${providerName} faces probe after food poisoning reports in Tirana`,
    `Labor inspectors cite ${providerName} over unpaid overtime claims`,
    `Customers report billing discrepancies tied to ${providerName} promotions`
  ];
}

function demoSentimentCheck(providerName: string, headlines: string[]) {
  if (headlines.length === 0) return { flagged: false, reason: "" };

  const severe = headlines.some((h) =>
    /\b(food poisoning|fraud|violation|probe|scandal|lawsuit|unpaid)\b/i.test(h)
  );

  if (!severe) return { flagged: false, reason: "" };

  return {
    flagged: true,
    reason: `${providerName} is flagged due to severe negative media sentiment (food safety / labor compliance).`
  };
}

async function checkSentimentFlag(providerName: string, headlines: string[]) {
  const demo = demoSentimentCheck(providerName, headlines);
  if (demo.flagged) return demo;

  if (headlines.length === 0) return { flagged: false, reason: "" };

  const llm = await callGroqJson<{ severeNegative?: boolean; reason?: string }>(
    `You analyze provider risk for employee benefits. Return ONLY JSON: {"severeNegative":boolean,"reason":"short phrase"}. Flag only severe issues: labor violations, food poisoning, fraud, major safety scandals.`,
    `Provider: ${providerName}\nRecent headlines:\n${headlines.map((h) => `- ${h}`).join("\n")}`
  );

  if (llm?.severeNegative) {
    return {
      flagged: true,
      reason:
        llm.reason?.trim() ||
        `${providerName} is flagged due to severe negative media sentiment.`
    };
  }

  return { flagged: false, reason: "" };
}

export async function evaluateClaimCompliance(input: {
  userId: string;
  companyId: string;
  offerId: string;
}): Promise<ClaimComplianceResponse> {
  const approved = await ComplianceReview.findOne({
    employeeId: input.userId,
    offerId: input.offerId,
    status: "approved"
  }).lean();

  if (approved) {
    return {
      allowed: true,
      blocked: false,
      status: "cleared",
      message: "Previously approved by your company."
    };
  }

  const pending = await ComplianceReview.findOne({
    employeeId: input.userId,
    offerId: input.offerId,
    status: "pending_manual_approval"
  }).lean();

  if (pending) {
    return {
      allowed: false,
      blocked: true,
      status: "pending_manual_approval",
      reviewId: String(pending._id),
      reason: pending.reason,
      message: "Pending company verification. Your HR team is reviewing this perk."
    };
  }

  const [employee, company, offer] = await Promise.all([
    User.findById(input.userId).select("name companyId").lean(),
    Company.findById(input.companyId).lean(),
    Offer.findById(input.offerId).populate("providerId").lean()
  ]);

  if (!employee || !company || !offer || !offer.isActive) {
    throw new ApiError(404, "OFFER_NOT_FOUND", "Offer not found");
  }

  const provider = offer.providerId as unknown as {
    _id: unknown;
    name: string;
    category: string;
    industry?: string;
    complianceDemoSentiment?: boolean;
  };

  const employerName = company.employerProfile?.displayName ?? company.name;
  const employerIndustry = company.employerProfile?.industry ?? "General";
  const providerIndustry = provider.industry ?? provider.category;

  const headlines = fetchDemoHeadlines(provider.name, Boolean(provider.complianceDemoSentiment));

  const [competitor, sentiment] = await Promise.all([
    checkCompetitorFlag({
      employerName,
      employerIndustry,
      providerName: provider.name,
      providerIndustry
    }),
    checkSentimentFlag(provider.name, headlines)
  ]);

  if (!competitor.flagged && !sentiment.flagged) {
    return {
      allowed: true,
      blocked: false,
      status: "cleared"
    };
  }

  const reason = [competitor.flagged ? competitor.reason : null, sentiment.flagged ? sentiment.reason : null]
    .filter(Boolean)
    .join(" ");

  const review = await ComplianceReview.create({
    employeeId: input.userId,
    employeeName: employee.name,
    companyId: input.companyId,
    offerId: offer._id,
    offerTitle: offer.title,
    providerId: String(provider._id),
    providerName: provider.name,
    employerName,
    employerIndustry,
    providerIndustry,
    amount: offer.price,
    currency: offer.currency,
    status: "pending_manual_approval",
    competitorFlag: competitor.flagged,
    sentimentFlag: sentiment.flagged,
    reason,
    headlines
  });

  const admins = await User.find({
    companyId: input.companyId,
    roles: "employer_admin"
  })
    .select("_id")
    .lean();

  await Promise.all(
    admins.map((admin) =>
      Notification.create({
        userId: admin._id,
        type: "compliance_flag",
        payload: {
          reviewId: review._id.toString(),
          employeeName: employee.name,
          offerTitle: offer.title,
          providerName: provider.name,
          amount: offer.price,
          currency: offer.currency,
          reason,
          competitorFlag: competitor.flagged,
          sentimentFlag: sentiment.flagged
        },
        read: false
      })
    )
  );

  return {
    allowed: false,
    blocked: true,
    status: "pending_manual_approval",
    reviewId: review._id.toString(),
    reason,
    message: "Pending company verification. Your HR team was notified."
  };
}

export async function listComplianceReviews(
  companyId: string,
  status: "pending_manual_approval" | "approved" | "rejected" = "pending_manual_approval"
) {
  const reviews = await ComplianceReview.find({ companyId, status })
    .sort({ createdAt: -1 })
    .lean();

  return reviews.map((review) => ({
    id: String(review._id),
    employeeId: String(review.employeeId),
    employeeName: review.employeeName,
    offerId: String(review.offerId),
    offerTitle: review.offerTitle,
    providerId: String(review.providerId),
    providerName: review.providerName,
    employerName: review.employerName,
    employerIndustry: review.employerIndustry,
    providerIndustry: review.providerIndustry,
    amount: review.amount,
    currency: review.currency,
    status: review.status,
    competitorFlag: review.competitorFlag,
    sentimentFlag: review.sentimentFlag,
    reason: review.reason,
    headlines: review.headlines ?? [],
    createdAt: review.createdAt.toISOString(),
    decidedAt: review.decidedAt?.toISOString()
  }));
}

export async function decideComplianceReview(input: {
  reviewId: string;
  companyId: string;
  employerId: string;
  decision: "approved" | "rejected";
  note?: string;
}) {
  const review = await ComplianceReview.findOne({
    _id: input.reviewId,
    companyId: input.companyId,
    status: "pending_manual_approval"
  });

  if (!review) {
    throw new ApiError(404, "REVIEW_NOT_FOUND", "Compliance review not found");
  }

  review.status = input.decision;
  review.decidedBy = input.employerId as never;
  review.decidedAt = new Date();
  review.decisionNote = input.note;
  await review.save();

  await Notification.create({
    userId: review.employeeId,
    type: "compliance_flag",
    payload: {
      event: input.decision,
      reviewId: review._id.toString(),
      offerTitle: review.offerTitle,
      providerName: review.providerName,
      reason: review.reason
    },
    read: false
  });

  return {
    id: review._id.toString(),
    status: review.status
  };
}
