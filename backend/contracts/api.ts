import { z } from "zod";

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional()
  })
});

export const RoleSchema = z.enum(["employee", "employer_admin", "provider_admin"]);
export const PackageStatusSchema = z.enum([
  "draft",
  "pending",
  "approved",
  "rejected",
  "settled",
  "partially_redeemed",
  "redeemed",
  "expired",
  "cancelled"
]);
export const PackageSourceSchema = z.enum(["manual", "ai", "pooled"]);
export const VoucherStatusSchema = z.enum(["issued", "redeemed", "expired", "void"]);

export const UserDTOSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  avatarUrl: z.string().url().optional(),
  initials: z.string(),
  locale: z.string(),
  preferences: z.array(z.string()),
  roles: z.array(RoleSchema),
  companyId: z.string()
});

export const OfferDTOSchema = z.object({
  id: z.string(),
  providerId: z.string(),
  providerName: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  price: z.number().int().nonnegative(),
  currency: z.string(),
  imageUrl: z.string().url().optional(),
  isLimited: z.boolean(),
  inventoryRemaining: z.number().int().nonnegative().optional(),
  expiresAt: z.string().datetime().optional(),
  visibility: z.enum(["public", "exclusive"]).default("public"),
  exclusiveCompanyIds: z.array(z.string()).optional(),
  urgencyLabel: z.string().optional(),
  isActive: z.boolean()
});

export const FeedMetaSchema = z.object({
  mode: z.enum(["default", "expiring_soon"]),
  daysUntilReset: z.number().int().nullable(),
  walletBalance: z.number().int().nonnegative(),
  boostedCategories: z.array(z.string()),
  contextLabel: z.string().optional()
});

export const PosBundleRequestSchema = z.object({
  offerId: z.string().min(1)
});

export const BundleComplementSchema = z.object({
  offer: OfferDTOSchema,
  shortLabel: z.string(),
  pitch: z.string()
});

export const PosBundleResponseSchema = z.object({
  showBundler: z.boolean(),
  offerId: z.string(),
  baseOffer: OfferDTOSchema,
  walletBalance: z.number().int().nonnegative(),
  remainingAfterBase: z.number().int().nonnegative(),
  headline: z.string(),
  agentPrompt: z.string(),
  complements: z.array(BundleComplementSchema)
});

export const ClaimComplianceRequestSchema = z.object({
  offerId: z.string().min(1)
});

export const ClaimComplianceResponseSchema = z.object({
  allowed: z.boolean(),
  blocked: z.boolean(),
  status: z.enum(["cleared", "pending_manual_approval"]),
  reviewId: z.string().optional(),
  reason: z.string().optional(),
  message: z.string().optional()
});

export const ComplianceReviewSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  employeeName: z.string(),
  offerId: z.string(),
  offerTitle: z.string(),
  providerId: z.string(),
  providerName: z.string(),
  employerName: z.string(),
  employerIndustry: z.string(),
  providerIndustry: z.string(),
  amount: z.number().int().nonnegative(),
  currency: z.string(),
  status: z.enum(["pending_manual_approval", "approved", "rejected"]),
  competitorFlag: z.boolean(),
  sentimentFlag: z.boolean(),
  reason: z.string(),
  headlines: z.array(z.string()),
  createdAt: z.string().datetime(),
  decidedAt: z.string().datetime().optional()
});

export const ComplianceReviewsResponseSchema = z.object({
  reviews: z.array(ComplianceReviewSchema)
});

export const DecideComplianceReviewRequestSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  note: z.string().max(500).optional()
});

export const DecideComplianceReviewResponseSchema = z.object({
  id: z.string(),
  status: z.enum(["approved", "rejected"])
});

export const TelegramLinkCodeResponseSchema = z.object({
  code: z.string(),
  expiresAt: z.string().datetime(),
  botUsername: z.string()
});

export const TelegramLinkStatusResponseSchema = z.object({
  linked: z.boolean(),
  linkedAt: z.string().datetime().optional(),
  botUsername: z.string()
});

export const PackageLineDTOSchema = z.object({
  id: z.string(),
  offerId: z.string(),
  providerId: z.string(),
  providerName: z.string(),
  title: z.string(),
  price: z.number().int().nonnegative(),
  currency: z.string(),
  aiReason: z.string().optional(),
  voucher: VoucherStatusSchema.optional()
});

export const PackageDTOSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  employeeName: z.string().optional(),
  employerId: z.string(),
  status: PackageStatusSchema,
  source: PackageSourceSchema,
  totalSnapshot: z.number().int().nonnegative(),
  currency: z.string(),
  aiReason: z.string().optional(),
  createdAt: z.string().datetime(),
  submittedAt: z.string().datetime().optional(),
  decidedAt: z.string().datetime().optional(),
  lines: z.array(PackageLineDTOSchema),
  vouchers: z.array(z.lazy(() => VoucherDTOSchema)).optional()
});

export const VoucherDTOSchema = z.object({
  id: z.string(),
  packageLineId: z.string(),
  code: z.string(),
  qrPayload: z.string(),
  status: VoucherStatusSchema,
  redeemedAt: z.string().datetime().optional()
});

export const LedgerEntryDTOSchema = z.object({
  type: z.enum(["fund", "allocate", "hold", "settle", "refund"]),
  amount: z.number().int().nonnegative(),
  currency: z.string(),
  providerName: z.string().optional(),
  createdAt: z.string().datetime()
});

export const GiftDTOSchema = z.object({
  id: z.string(),
  fromUserId: z.string(),
  toUserId: z.string(),
  offerId: z.string().optional(),
  amount: z.number().int().nonnegative(),
  currency: z.string(),
  message: z.string(),
  status: z.enum(["sent", "claimed", "expired"]),
  createdAt: z.string().datetime(),
  claimedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional()
});

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});
export const LoginResponseSchema = z.object({
  token: z.string(),
  user: UserDTOSchema
});
export const MeResponseSchema = z.object({ user: UserDTOSchema });

export const SignupCompanyRequestSchema = z.object({
  companyName: z.string().min(1),
  country: z.string().min(2),
  currency: z.string().min(3),
  locale: z.string().min(2),
  roles: z.array(z.enum(["employer", "provider"])).min(1),
  admin: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6)
  }),
  employerPolicy: z.object({
    perEmployeeAllowance: z.number().int().nonnegative(),
    resetPeriod: z.enum(["monthly", "quarterly", "annual"]),
    allowedCategories: z.array(z.string()).min(1)
  }).optional(),
  providerProfile: z.object({
    category: z.string().min(1),
    description: z.string().min(1),
    logoUrl: z.string().url().optional()
  }).optional()
});
export const SignupEmployeeRequestSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  companyId: z.string().min(1)
});
export const PublicCompaniesQuerySchema = z.object({
  role: z.enum(["employer"]).default("employer")
});
export const PublicCompaniesResponseSchema = z.object({
  companies: z.array(z.object({
    id: z.string(),
    name: z.string(),
    logoUrl: z.string().url().optional()
  }))
});

export const OffersQuerySchema = z.object({
  category: z.string().optional(),
  q: z.string().optional()
});
export const OffersResponseSchema = z.object({
  offers: z.array(OfferDTOSchema),
  feedMeta: FeedMetaSchema.optional()
});
export const DropsResponseSchema = z.object({
  drops: z.array(z.object({
    id: z.string(),
    badgeLabel: z.string(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    offer: OfferDTOSchema
  }))
});
export const OfferResponseSchema = z.object({ offer: OfferDTOSchema });

export const AllowanceResponseSchema = z.object({
  allowance: z.object({
    total: z.number().int().nonnegative(),
    used: z.number().int().nonnegative(),
    held: z.number().int().nonnegative(),
    available: z.number().int(),
    bonusAvailable: z.number().int().nonnegative().optional(),
    bonusUsed: z.number().int().nonnegative().optional(),
    currency: z.string(),
    periodResetAt: z.string().datetime(),
    allowedCategories: z.array(z.string())
  })
});

export const UserProgressDTOSchema = z.object({
  xp: z.number().int().nonnegative(),
  level: z.number().int().positive(),
  levelTitle: z.string(),
  tier: z.enum(["bronze", "silver", "gold"]),
  tierTitle: z.string(),
  streakCount: z.number().int().nonnegative(),
  streakWeeks: z.number().int().nonnegative(),
  streakFreezes: z.number().int().nonnegative(),
  streakAtRisk: z.boolean(),
  xpToNextLevel: z.number().int().nonnegative(),
  nextLevelXp: z.number().int().nonnegative(),
  bonusCreditsUnlocked: z.number().int().nonnegative(),
  bonusCreditsAvailable: z.number().int().nonnegative(),
  totalRedemptions: z.number().int().nonnegative(),
  bonusUnlocked: z.boolean(),
  officeLegends: z.array(
    z.object({
      providerId: z.string(),
      providerName: z.string(),
      month: z.string(),
      badgeLabel: z.string()
    })
  ).optional()
});

export const ActivityFeedItemDTOSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  message: z.string(),
  offerTitles: z.array(z.string()),
  highFiveCount: z.number().int().nonnegative(),
  highFivedByMe: z.boolean(),
  createdAt: z.string().datetime()
});

export const ActivityFeedResponseSchema = z.object({
  items: z.array(ActivityFeedItemDTOSchema)
});

export const HighFiveResponseSchema = z.object({
  highFiveCount: z.number().int().nonnegative(),
  xpAwarded: z.number().int().nonnegative()
});

export const StreakFreezeResponseSchema = z.object({
  streakFreezes: z.number().int().nonnegative(),
  xp: z.number().int().nonnegative(),
  cost: z.number().int().nonnegative()
});

export const QuestDTOSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  targetCategory: z.string(),
  targetCount: z.number().int().positive(),
  currentCount: z.number().int().nonnegative(),
  progressPct: z.number().int().min(0).max(100),
  rewardXp: z.number().int().nonnegative(),
  status: z.enum(["active", "completed"]),
  icon: z.string().optional()
});

export const CreateQuestRequestSchema = z.object({
  title: z.string().trim().min(3).max(80),
  description: z.string().trim().min(10).max(300),
  targetCategory: z.string().trim().min(1),
  targetCount: z.number().int().min(1).max(10000),
  rewardXp: z.number().int().min(0).max(5000).optional(),
  icon: z.string().trim().max(8).optional()
});

export const QuestsResponseSchema = z.object({
  quests: z.array(QuestDTOSchema)
});

export const QuestResponseSchema = z.object({
  quest: QuestDTOSchema
});

export const GamificationResponseSchema = z.object({
  progress: UserProgressDTOSchema,
  quests: z.array(QuestDTOSchema)
});

export const GamificationAwardDTOSchema = z.object({
  xpAwarded: z.number().int().nonnegative(),
  streakCount: z.number().int().nonnegative(),
  level: z.number().int().positive(),
  leveledUp: z.boolean(),
  bonusUnlocked: z.boolean(),
  employeeName: z.string()
});

export const EmployerCompanyResponseSchema = z.object({
  company: z.object({
    id: z.string(),
    name: z.string(),
    country: z.string(),
    currency: z.string(),
    locale: z.string(),
    walletBalance: z.number().int().nonnegative()
  }),
  policy: z.object({
    perEmployeeAllowance: z.number().int().nonnegative(),
    resetPeriod: z.enum(["monthly", "quarterly", "annual"]),
    allowedCategories: z.array(z.string()),
    currency: z.string()
  })
});
export const UpdateEmployerPolicyRequestSchema = z.object({
  perEmployeeAllowance: z.number().int().nonnegative().optional(),
  resetPeriod: z.enum(["monthly", "quarterly", "annual"]).optional(),
  allowedCategories: z.array(z.string()).min(1).optional(),
  currency: z.string().min(3).optional()
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one policy field is required"
});
export const EmployerEmployeesResponseSchema = z.object({
  employees: z.array(z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    avatarUrl: z.string().url().optional(),
    initials: z.string(),
    allowance: z.object({
      total: z.number().int().nonnegative(),
      used: z.number().int().nonnegative(),
      held: z.number().int().nonnegative(),
      available: z.number().int(),
      currency: z.string(),
      periodResetAt: z.string().datetime()
    })
  }))
});
export const FundWalletRequestSchema = z.object({
  amount: z.number().int().positive()
});
export const FundWalletResponseSchema = z.object({
  company: z.object({
    id: z.string(),
    walletBalance: z.number().int().nonnegative(),
    currency: z.string()
  })
});

export const PackagesQuerySchema = z.object({
  status: PackageStatusSchema.optional()
});
export const PackagesResponseSchema = z.object({ packages: z.array(PackageDTOSchema) });
export const DraftPackageResponseSchema = z.object({
  package: PackageDTOSchema.nullable()
});
export const NotificationsResponseSchema = z.object({
  notifications: z.array(z.object({
    id: z.string(),
    type: z.string(),
    payload: z.unknown(),
    read: z.boolean(),
    createdAt: z.string().datetime()
  }))
});

export const CreatePackageRequestSchema = z.object({
  offerIds: z.array(z.string()).min(1),
  source: PackageSourceSchema.default("manual")
});
export const UpdatePackageRequestSchema = z.object({
  offerIds: z.array(z.string()).min(1)
});
export const PackageResponseSchema = z.object({ package: PackageDTOSchema });
export const SubmitPackageResponseSchema = z.object({
  package: PackageDTOSchema,
  autoApproved: z.boolean(),
  vouchers: z.array(VoucherDTOSchema)
});
export const CancelPackageResponseSchema = z.object({ package: PackageDTOSchema });

export const ApprovalsQuerySchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "settled", "expired"]).default("pending")
});
export const ApprovalsResponseSchema = z.object({ packages: z.array(PackageDTOSchema) });
export const ApprovePackageResponseSchema = z.object({
  package: PackageDTOSchema,
  vouchers: z.array(VoucherDTOSchema),
  ledgerEntries: z.array(LedgerEntryDTOSchema)
});
export const RejectPackageRequestSchema = z.object({
  reason: z.string().max(500).optional()
});
export const RejectPackageResponseSchema = z.object({
  package: PackageDTOSchema,
  ledgerEntries: z.array(LedgerEntryDTOSchema)
});
export const EmployerInsightsResponseSchema = z.object({
  utilization: z.object({
    totalAllocated: z.number().int().nonnegative(),
    totalUsed: z.number().int().nonnegative(),
    totalHeld: z.number().int().nonnegative(),
    currency: z.string(),
    totalSpent: z.number().int().nonnegative()
  }),
  requestCounts: z.object({
    auto: z.number().int().nonnegative(),
    manual: z.number().int().nonnegative()
  }),
  spendByCategory: z.array(z.object({
    category: z.string(),
    amount: z.number().int().nonnegative()
  })),
  spendByEmployee: z.array(z.object({
    employeeId: z.string(),
    employeeName: z.string(),
    amount: z.number().int().nonnegative()
  })),
  popularCategories: z.array(z.object({
    category: z.string(),
    spend: z.number().int().nonnegative(),
    count: z.number().int().nonnegative()
  })),
  unusedCategories: z.array(z.object({
    category: z.string(),
    employeeCount: z.number().int().nonnegative()
  })),
  suggestions: z.array(z.object({
    category: z.string(),
    reason: z.string()
  }))
});

export const ProviderCompanyResponseSchema = z.object({
  company: z.object({
    id: z.string(),
    name: z.string(),
    country: z.string(),
    currency: z.string(),
    locale: z.string()
  }),
  provider: z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    country: z.string(),
    logoUrl: z.string().url().optional(),
    description: z.string()
  })
});
export const ProviderOffersResponseSchema = z.object({
  offers: z.array(OfferDTOSchema)
});
export const CreateProviderOfferRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  price: z.number().int().nonnegative(),
  currency: z.string().min(3),
  imageUrl: z.string().url().optional(),
  isLimited: z.boolean().optional(),
  expiresAt: z.string().datetime().optional()
});
export const UpdateProviderOfferRequestSchema = CreateProviderOfferRequestSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "At least one field is required" }
);
export const ProviderOfferResponseSchema = z.object({ offer: OfferDTOSchema });
export const ProviderEarningsResponseSchema = z.object({
  balance: z.number().int().nonnegative(),
  currency: z.string(),
  pendingTotal: z.number().int().nonnegative(),
  pendingCount: z.number().int().nonnegative(),
  settledTotal: z.number().int().nonnegative(),
  pendingSettlements: z.array(z.object({
    packageId: z.string(),
    packageLineId: z.string(),
    amount: z.number().int().nonnegative(),
    currency: z.string(),
    status: z.string(),
    submittedAt: z.string().datetime().optional()
  })),
  recentSettlements: z.array(LedgerEntryDTOSchema)
});

export const AiConciergeRequestSchema = z.object({
  message: z.string().min(1),
  budget: z.number().int().positive().optional(),
  demo: z.boolean().optional()
});
export const AiBundleRequestSchema = z.object({
  goal: z.string().min(1),
  budget: z.number().int().positive(),
  demo: z.boolean().optional()
});
export const AiPackageResponseSchema = z.object({
  packageDraft: PackageDTOSchema,
  reason: z.string(),
  fallbackUsed: z.boolean()
});

export const ConciergeSuggestionSchema = z.object({
  label: z.enum(["A", "B", "C"]),
  title: z.string(),
  summary: z.string(),
  total: z.number().int().nonnegative(),
  packageDraft: PackageDTOSchema
});

export const ConciergeGreetingResponseSchema = z.object({
  openingMessage: z.string(),
  currency: z.string(),
  available: z.number().int().nonnegative(),
  preferences: z.array(z.string()),
  suggestions: z.array(ConciergeSuggestionSchema)
});

export const BenefitRequestItemSchema = z.object({
  name: z.string(),
  description: z.string(),
  link: z.string().url().optional(),
  phone: z.string().optional(),
  category: z.string()
});

export const DemandProviderLeadSchema = z.object({
  name: z.string(),
  address: z.string(),
  phone: z.string(),
  email: z.string(),
  mapsUrl: z.string(),
  outreachStatus: z.enum(["pending", "sent", "failed"])
});

export const DemandPoolSchema = z.object({
  campaignId: z.string(),
  label: z.string(),
  location: z.string(),
  yourContribution: z.number().int().nonnegative(),
  totalPooled: z.number().int().nonnegative(),
  currency: z.string(),
  employeeCount: z.number().int().positive(),
  providersContacted: z.number().int().nonnegative(),
  providers: z.array(DemandProviderLeadSchema)
});

export const AiConciergeResponseSchema = z.object({
  kind: z.enum(["bundle", "off_catalog", "demand_generation"]),
  message: z.string(),
  packageDraft: PackageDTOSchema.optional(),
  reason: z.string().optional(),
  fallbackUsed: z.boolean().optional(),
  benefitRequest: z.object({
    id: z.string(),
    items: z.array(BenefitRequestItemSchema),
    status: z.enum(["pending", "approved", "declined"])
  }).optional(),
  demandPool: DemandPoolSchema.optional()
});

export const BenefitRequestDTOSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  employeeName: z.string(),
  employeeEmail: z.string(),
  originalMessage: z.string(),
  items: z.array(BenefitRequestItemSchema),
  status: z.enum(["pending", "approved", "declined"]),
  employerNote: z.string().optional(),
  createdAt: z.string().datetime(),
  decidedAt: z.string().datetime().optional()
});

export const BenefitRequestsResponseSchema = z.object({
  requests: z.array(BenefitRequestDTOSchema)
});

export const DecideBenefitRequestSchema = z.object({
  status: z.enum(["approved", "declined"]),
  employerNote: z.string().max(500).optional()
});

export const RedeemVoucherResponseSchema = z.object({
  voucher: VoucherDTOSchema,
  gamification: GamificationAwardDTOSchema.optional()
});

export const CreateGiftRequestSchema = z.object({
  toUserId: z.string(),
  offerId: z.string().optional(),
  amount: z.number().int().positive(),
  currency: z.string(),
  message: z.string().min(1).max(500)
});
export const GiftResponseSchema = z.object({ gift: GiftDTOSchema });
export const WrappedResponseSchema = z.object({
  savedAmount: z.number().int().nonnegative(),
  currency: z.string(),
  topCategory: z.string(),
  topProviders: z.array(z.object({
    name: z.string(),
    count: z.number().int().nonnegative()
  })),
  redeemedCount: z.number().int().nonnegative(),
  persona: z.string(),
  categoryDiversity: z.number().int().nonnegative()
});

export const PeerAdvocacyColleagueSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  initials: z.string(),
  avatarUrl: z.string().url().optional(),
  departmentId: z.string().optional(),
  walletAvailable: z.number().int().nonnegative(),
  reason: z.string()
});

export const PeerAdvocacyPromptSchema = z.object({
  id: z.string(),
  vendorName: z.string(),
  offerTitle: z.string(),
  category: z.string(),
  categoryWalletLabel: z.string(),
  colleagues: z.array(PeerAdvocacyColleagueSchema),
  createdAt: z.string().datetime()
});

export const PeerAdvocacyPendingResponseSchema = z.object({
  advocacy: PeerAdvocacyPromptSchema.nullable()
});

export const PeerAdvocacySendRequestSchema = z.object({
  toUserId: z.string().min(1)
});

export const PeerAdvocacySendResponseSchema = z.object({
  ok: z.boolean(),
  recipientName: z.string(),
  message: z.string()
});

export const PooledCartContributionSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  userInitials: z.string(),
  amount: z.number().int().positive(),
  committedAt: z.string().datetime()
});

export const PooledCartVoucherSchema = z.object({
  code: z.string(),
  qrPayload: z.string(),
  status: z.string()
});

export const PooledCartSchema = z.object({
  id: z.string(),
  inviteCode: z.string(),
  invitePath: z.string(),
  status: z.enum(["pending", "locked", "cancelled", "redeemed"]),
  offerId: z.string(),
  offerTitle: z.string(),
  providerName: z.string(),
  targetPrice: z.number().int().positive(),
  suggestedContribution: z.number().int().positive(),
  committedTotal: z.number().int().nonnegative(),
  remainingAmount: z.number().int().nonnegative(),
  progressPercent: z.number().int().min(0).max(100),
  currency: z.string(),
  contributions: z.array(PooledCartContributionSchema),
  initiatorId: z.string(),
  initiatorName: z.string(),
  isInitiator: z.boolean(),
  currentUserContribution: z.number().int().nonnegative().optional(),
  hasCommitted: z.boolean(),
  voucher: PooledCartVoucherSchema.optional(),
  lockedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime()
});

export const CreatePooledCartRequestSchema = z.object({
  offerId: z.string().min(1),
  initialCommit: z.number().int().positive()
});

export const CommitPooledCartRequestSchema = z.object({
  amount: z.number().int().positive()
});

export const PooledCartResponseSchema = z.object({
  cart: PooledCartSchema
});

export type UserDTO = z.infer<typeof UserDTOSchema>;
export type OfferDTO = z.infer<typeof OfferDTOSchema>;
export type PackageDTO = z.infer<typeof PackageDTOSchema>;
export type VoucherDTO = z.infer<typeof VoucherDTOSchema>;
export type LedgerEntryDTO = z.infer<typeof LedgerEntryDTOSchema>;
export type UserProgressDTO = z.infer<typeof UserProgressDTOSchema>;
export type QuestDTO = z.infer<typeof QuestDTOSchema>;
export type GamificationAwardDTO = z.infer<typeof GamificationAwardDTOSchema>;
export type SignupCompanyRequest = z.infer<typeof SignupCompanyRequestSchema>;
export type SignupEmployeeRequest = z.infer<typeof SignupEmployeeRequestSchema>;
