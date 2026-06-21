// ─── Perx Frontend API Contracts ──────────────────────────────────────────
// Source of truth: backend/contracts/api.ts (Codex). Types below mirror it.
// Internal Offer type is kept for OfferCard / Zustand store compatibility
// (both were built before the real contract landed and cannot change this slice).
// Use offerDTOtoOffer() at the data layer to bridge them.

// ─── Internal component types (OfferCard / store — do not change) ──────────

export type Category =
  | "all"
  | "wellness"
  | "food"
  | "travel"
  | "learning"
  | "lifestyle";

export interface Provider {
  id: string;
  name: string;
  location: string;
}

/** Internal offer shape used by OfferCard and the Zustand package store. */
export interface Offer {
  id: string;
  provider: Provider;
  category: Exclude<Category, "all">;
  title: string;
  description: string;
  priceALL: number;
  imageUrl: string;
  isLimited?: boolean;
  inventoryRemaining?: number;
  expiresAt?: string;
  visibility?: "public" | "exclusive";
  urgencyLabel?: string;
}

// ─── Real backend DTO types ────────────────────────────────────────────────

export type Role = "employee" | "employer_admin" | "provider_admin";

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  initials: string;
  locale: string;
  preferences: string[];
  roles: Role[];
  companyId: string;
}

/** Mirrors backend OfferDTOSchema exactly. */
export interface OfferDTO {
  id: string;
  providerId: string;
  providerName: string;
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  imageUrl?: string;
  isLimited: boolean;
  inventoryRemaining?: number;
  expiresAt?: string;
  visibility?: "public" | "exclusive";
  exclusiveCompanyIds?: string[];
  urgencyLabel?: string;
  isActive: boolean;
}

export interface FeedMeta {
  mode: "default" | "expiring_soon";
  daysUntilReset: number | null;
  walletBalance: number;
  boostedCategories: string[];
  contextLabel?: string;
}

export interface PosBundleComplement {
  offer: OfferDTO;
  shortLabel: string;
  pitch: string;
}

export interface PosBundleResponse {
  showBundler: boolean;
  offerId: string;
  baseOffer: OfferDTO;
  walletBalance: number;
  remainingAfterBase: number;
  headline: string;
  agentPrompt: string;
  complements: PosBundleComplement[];
}

export interface ClaimComplianceResponse {
  allowed: boolean;
  blocked: boolean;
  status: "cleared" | "pending_manual_approval";
  reviewId?: string;
  reason?: string;
  message?: string;
}

export interface ComplianceReviewDTO {
  id: string;
  employeeId: string;
  employeeName: string;
  offerId: string;
  offerTitle: string;
  providerId: string;
  providerName: string;
  employerName: string;
  employerIndustry: string;
  providerIndustry: string;
  amount: number;
  currency: string;
  status: "pending_manual_approval" | "approved" | "rejected";
  competitorFlag: boolean;
  sentimentFlag: boolean;
  reason: string;
  headlines: string[];
  createdAt: string;
  decidedAt?: string;
}

export interface DropDTO {
  id: string;
  badgeLabel: string;
  startsAt: string;
  endsAt: string;
  offer: OfferDTO;
}

export interface AllowanceDTO {
  total: number;
  used: number;
  held: number;
  available: number;
  bonusAvailable?: number;
  bonusUsed?: number;
  currency: string;
  periodResetAt: string;
  allowedCategories: string[];
}

export interface UserProgressDTO {
  xp: number;
  level: number;
  levelTitle: string;
  tier: "bronze" | "silver" | "gold";
  tierTitle: string;
  streakCount: number;
  streakWeeks: number;
  streakFreezes: number;
  streakAtRisk: boolean;
  xpToNextLevel: number;
  nextLevelXp: number;
  bonusCreditsUnlocked: number;
  bonusCreditsAvailable: number;
  totalRedemptions: number;
  bonusUnlocked: boolean;
  officeLegends?: Array<{
    providerId: string;
    providerName: string;
    month: string;
    badgeLabel: string;
  }>;
}

export interface ActivityFeedItemDTO {
  id: string;
  userId: string;
  userName: string;
  message: string;
  offerTitles: string[];
  highFiveCount: number;
  highFivedByMe: boolean;
  createdAt: string;
}

export interface QuestDTO {
  id: string;
  title: string;
  description: string;
  targetCategory: string;
  targetCount: number;
  currentCount: number;
  progressPct: number;
  rewardXp: number;
  status: "active" | "completed";
  icon?: string;
}

export interface CreateQuestRequest {
  title: string;
  description: string;
  targetCategory: string;
  targetCount: number;
  rewardXp?: number;
  icon?: string;
}

export interface GamificationDTO {
  progress: UserProgressDTO;
  quests: QuestDTO[];
}

export interface GamificationAwardDTO {
  xpAwarded: number;
  streakCount: number;
  level: number;
  leveledUp: boolean;
  bonusUnlocked: boolean;
  employeeName: string;
}

export interface EmployerCompanyDTO {
  company: {
    id: string;
    name: string;
    country: string;
    currency: string;
    locale: string;
    walletBalance: number;
  };
  policy: {
    perEmployeeAllowance: number;
    resetPeriod: "monthly" | "quarterly" | "annual";
    allowedCategories: string[];
    currency: string;
  };
}

export interface UpdateEmployerPolicyRequest {
  perEmployeeAllowance?: number;
  resetPeriod?: "monthly" | "quarterly" | "annual";
  allowedCategories?: string[];
  currency?: string;
}

export interface EmployeeWithAllowanceDTO {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  initials: string;
  allowance: {
    total: number;
    used: number;
    held: number;
    available: number;
    currency: string;
    periodResetAt: string;
  };
}

export interface ProviderCompanyDTO {
  company: {
    id: string;
    name: string;
    country: string;
    currency: string;
    locale: string;
  };
  provider: {
    id: string;
    name: string;
    category: string;
    country: string;
    logoUrl?: string;
    description: string;
  };
}

export interface ProviderEarningsDTO {
  balance: number;
  currency: string;
  pendingTotal: number;
  pendingCount: number;
  settledTotal: number;
  pendingSettlements: Array<{
    packageId: string;
    packageLineId: string;
    amount: number;
    currency: string;
    status: string;
    submittedAt?: string;
  }>;
  recentSettlements: Array<{
    type: "fund" | "allocate" | "hold" | "settle" | "refund";
    amount: number;
    currency: string;
    providerName?: string;
    createdAt: string;
  }>;
}

export interface EmployerInsightsDTO {
  utilization: {
    totalAllocated: number;
    totalUsed: number;
    totalHeld: number;
    currency: string;
    totalSpent: number;
  };
  requestCounts: { auto: number; manual: number };
  spendByCategory: { category: string; amount: number }[];
  spendByEmployee: { employeeId: string; employeeName: string; amount: number }[];
  popularCategories: { category: string; spend: number; count: number }[];
  unusedCategories: { category: string; employeeCount: number }[];
  suggestions: { category: string; reason: string }[];
}

export interface PublicCompanyDTO {
  id: string;
  name: string;
  logoUrl?: string;
}

export type PackageStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "settled"
  | "partially_redeemed"
  | "redeemed"
  | "expired"
  | "cancelled";

export interface PackageLineDTO {
  id: string;
  offerId: string;
  providerId: string;
  providerName: string;
  title: string;
  price: number;
  currency: string;
  aiReason?: string;
}

export interface PackageDTO {
  id: string;
  employeeId: string;
  employeeName?: string;
  employerId: string;
  status: PackageStatus;
  source: "manual" | "ai" | "pooled";
  totalSnapshot: number;
  currency: string;
  aiReason?: string;
  createdAt: string;
  submittedAt?: string;
  decidedAt?: string;
  lines: PackageLineDTO[];
  vouchers?: VoucherDTO[];
}

export interface NotificationDTO {
  id: string;
  type: string;
  payload: unknown;
  read: boolean;
  createdAt: string;
}

export interface GiftDTO {
  id: string;
  fromUserId: string;
  toUserId: string;
  offerId?: string;
  amount: number;
  currency: string;
  message: string;
  status: "sent" | "claimed" | "expired";
  createdAt: string;
  claimedAt?: string;
  expiresAt?: string;
}

export interface WrappedDTO {
  savedAmount: number;
  currency: string;
  topCategory: string;
  topProviders: { name: string; count: number }[];
  redeemedCount: number;
  persona: string;
  categoryDiversity: number;
}

export interface ColleagueDTO {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatarUrl?: string;
}

export interface PeerAdvocacyColleagueDTO extends ColleagueDTO {
  departmentId?: string;
  walletAvailable: number;
  reason: string;
}

export interface PeerAdvocacyPromptDTO {
  id: string;
  vendorName: string;
  offerTitle: string;
  category: string;
  categoryWalletLabel: string;
  colleagues: PeerAdvocacyColleagueDTO[];
  createdAt: string;
}

export interface TelegramLinkCodeDTO {
  code: string;
  expiresAt: string;
  botUsername: string;
}

export interface TelegramLinkStatusDTO {
  linked: boolean;
  linkedAt?: string;
  botUsername: string;
}

export interface PooledCartContributionDTO {
  userId: string;
  userName: string;
  userInitials: string;
  amount: number;
  committedAt: string;
}

export interface PooledCartDTO {
  id: string;
  inviteCode: string;
  invitePath: string;
  status: "pending" | "locked" | "cancelled" | "redeemed";
  offerId: string;
  offerTitle: string;
  providerName: string;
  targetPrice: number;
  suggestedContribution: number;
  committedTotal: number;
  remainingAmount: number;
  progressPercent: number;
  currency: string;
  contributions: PooledCartContributionDTO[];
  initiatorId: string;
  initiatorName: string;
  isInitiator: boolean;
  currentUserContribution?: number;
  hasCommitted: boolean;
  voucher?: { code: string; qrPayload: string; status: string };
  lockedAt?: string;
  createdAt: string;
}

export interface AiPackageResponseDTO {
  packageDraft: PackageDTO;
  reason: string;
  fallbackUsed: boolean;
}

export interface ConciergeSuggestionDTO {
  label: "A" | "B" | "C";
  title: string;
  summary: string;
  total: number;
  packageDraft: PackageDTO;
}

export interface ConciergeGreetingDTO {
  openingMessage: string;
  currency: string;
  available: number;
  preferences: string[];
  suggestions: ConciergeSuggestionDTO[];
}

export interface BenefitRequestItemDTO {
  name: string;
  description: string;
  link?: string;
  phone?: string;
  category: string;
}

export interface DemandProviderLeadDTO {
  name: string;
  address: string;
  phone: string;
  email: string;
  mapsUrl: string;
  outreachStatus: "pending" | "sent" | "failed";
}

export interface DemandPoolDTO {
  campaignId: string;
  label: string;
  location: string;
  yourContribution: number;
  totalPooled: number;
  currency: string;
  employeeCount: number;
  providersContacted: number;
  providers: DemandProviderLeadDTO[];
}

export interface AiConciergeResponseDTO {
  kind: "bundle" | "off_catalog" | "demand_generation";
  message: string;
  packageDraft?: PackageDTO;
  reason?: string;
  fallbackUsed?: boolean;
  benefitRequest?: {
    id: string;
    items: BenefitRequestItemDTO[];
    status: "pending" | "approved" | "declined";
  };
  demandPool?: DemandPoolDTO;
}

export interface BenefitRequestDTO {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  originalMessage: string;
  items: BenefitRequestItemDTO[];
  status: "pending" | "approved" | "declined";
  employerNote?: string;
  createdAt: string;
  decidedAt?: string;
}

export interface VoucherDTO {
  id: string;
  packageLineId: string;
  code: string;
  qrPayload: string;
  status: "issued" | "redeemed" | "expired" | "void";
  redeemedAt?: string;
}

export interface SubmitPackageResponseDTO {
  package: PackageDTO;
  autoApproved: boolean;
  vouchers: VoucherDTO[];
}

// ─── Mapper: OfferDTO -> internal Offer ───────────────────────────────────

/** Convert backend OfferDTO to the internal Offer shape used by OfferCard / store. */
export function offerDTOtoOffer(dto: OfferDTO): Offer {
  return {
    id: dto.id,
    provider: {
      id: dto.providerId,
      name: dto.providerName,
      location: "",
    },
    category: (dto.category as Exclude<Category, "all">) ?? "lifestyle",
    title: dto.title,
    description: dto.description,
    priceALL: dto.price,
    imageUrl: dto.imageUrl ?? "https://picsum.photos/seed/perx-default/800/500",
    isLimited: dto.isLimited,
    inventoryRemaining: dto.inventoryRemaining,
    expiresAt: dto.expiresAt,
    visibility: dto.visibility,
    urgencyLabel: dto.urgencyLabel,
  };
}

// ─── Quarter label helper ──────────────────────────────────────────────────

export function quarterLabel(periodResetAt: string): string {
  const d = new Date(periodResetAt);
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `Q${q} ${d.getFullYear()}`;
}

// ─── API response wrappers ─────────────────────────────────────────────────

export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}
