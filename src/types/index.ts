export type ConsentStatus = 'GRANTED' | 'REVOKED';
export type DataCategory = 'PERSONAL_DATA' | 'CONTRACT_DATA' | 'FINANCIAL_DATA' | 'USAGE_DATA';
export type Purpose = 'PROMOTION' | 'BILLING' | 'ANALYTICS' | 'CUSTOMER_SERVICE';
export type IssuerType = 'USER' | 'OPERATOR' | 'SYSTEM';

// ── user-service ─────────────────────────────────────────────────────────────

export interface CreateUserCommand {
  fullName: string;
  email: string;
  documentNumber: string;
  birthDate?: string;
}

export interface UserResponse {
  id: number;
  fullName: string;
  email: string;
  documentNumber: string;
  birthDate: string | null;
  createdAt: string;
  active: boolean;
}

export interface DeactivateUserResponse {
  userId: number;
  status: string;
  consentsRevoked: number;
}

export interface UserContractProfileDTO {
  id: number;
  contractType: string;
  planName: string;
  startDate: string;
  endDate: string | null;
  monthlyFee: string;
  status: string;
}

export interface UserUsageProfileDTO {
  id: number;
  serviceType: string;
  usageAmount: string;
  usageUnit: string;
  recordedAt: string;
}

// ── consent-command-service ──────────────────────────────────────────────────

export interface ConsentAuthorizationRequest {
  dataCategory: string;
  purposes: string[];
}

export interface IssuerRequest {
  issuer: IssuerType;
  id: number;
}

export interface GrantConsentRequest {
  ownerId: number;
  authorizations: ConsentAuthorizationRequest[];
  legalBasis: string;
  occurredAt?: string;
  issuedBy: IssuerRequest;
}

export interface RevokeConsentRequest {
  ownerId: number;
  authorizations: ConsentAuthorizationRequest[];
  reason: string;
  occurredAt?: string;
  issuedBy: IssuerRequest;
}

export interface DeactivateConsentRequest {
  ownerId: number;
  issuedBy: IssuerRequest;
}

export interface DeactivateConsentResponse {
  ownerId: number;
  consentsRevoked: number;
}

// ── consent-query-service ────────────────────────────────────────────────────

export interface ConsentAuthorizationDetail {
  dataCategory: string;
  purpose: string;
  status: ConsentStatus;
  legalBasis: string | null;
  grantedAt: string;
  revokedAt: string | null;
}

export interface ConsentResponse {
  userId: number;
  authorizations: ConsentAuthorizationDetail[];
}

export interface ConsentHistoryEntry {
  eventType: string;
  dataCategory: string;
  finality: string;
  version: number;
  occurredAt: string;
  issuedBy: { id: string; type: string } | null;
}

export interface ConsentHistoryResponse {
  userId: number;
  events: ConsentHistoryEntry[];
}

export interface BatchAuthorizationRequest {
  titularIds: number[];
  dataCategory: string;
  purpose: string;
}

export interface TitularAuthorizationResult {
  titularId: number;
  authorized: boolean;
  reason: string | null;
}

export interface BatchAuthorizationResponse {
  results: TitularAuthorizationResult[];
}

// ── dashboard-service ────────────────────────────────────────────────────────

export interface DashboardMetrics {
  id: string;
  totalGranted: number;
  totalRevoked: number;
  activeConsents: number;
  lastUpdated: string | null;
  lastProcessedEventId: string | null;
  byFinality: DimensionMetrics[];
  byCategory: DimensionMetrics[];
  timeSeries: TimeSeriesEntry[];
}

export interface DimensionMetrics {
  name: string;
  granted: number;
  revoked: number;
  active: number;
  revokeRate: number;
}

export interface TimeSeriesEntry {
  date: string;
  granted: number;
  revoked: number;
  activeAtEnd: number;
}

export interface TimeSeriesResponse {
  period: { from: string; to: string };
  data: TimeSeriesEntry[];
}

// ── billing-service ──────────────────────────────────────────────────────────

export interface CreateBillingRecordCommand {
  dataSubjectId: string;
  description: string;
  amount: number;
}

export interface BillingRecordResponse {
  id: number;
  dataSubjectId: string;
  description: string;
  amount: string;
  status: string;
  createdAt: string;
}

export interface UserProfileResponse {
  id: number;
  fullName: string;
  email: string;
  documentNumber: string;
  birthDate: string | null;
  createdAt: string;
}

export interface BillingWithProfileResponse {
  billingRecord: BillingRecordResponse;
  userProfile: UserProfileResponse;
}

// ── promotion-service ────────────────────────────────────────────────────────

export interface PromotionRequest {
  dataSubjectId: string;
  name: string;
  description?: string;
  discountPercent: number;
  startDate: string;
  endDate?: string;
  targetSegment: string;
}

export interface PromotionResponse {
  id: number;
  name: string;
  description: string | null;
  discountPercent: string;
  startDate: string;
  endDate: string | null;
  targetSegment: string;
  status: string;
  createdAt: string;
}

export interface PromotionWithProfileResponse {
  userProfile: UserProfileResponse;
  usageData: UserUsageProfileDTO[];
  availablePromotions: PromotionResponse[];
}

// ── audit-service ────────────────────────────────────────────────────────────

export type ViolationReason =
  | 'CONSENT_REVOKED_BEFORE_ACCESS'
  | 'NO_CONSENT_RECORD'
  | 'PURPOSE_MISMATCH';

export interface TrailItem {
  traceId: string;
  timestamp: string;
  clientId: string;
  decision: string;
  deniedReason: string | null;
  purpose: string;
  dataCategories: string[];
  endpoint: string;
  method: string;
}

export interface ComplianceDetail {
  traceId: string;
  timestamp: string;
  clientId: string;
  dataCategory: string;
  decision: string;
  consentStatus: string;
  compliant: boolean;
  violation: ViolationReason | null;
}

export interface ComplianceReportResponse {
  dataSubjectId: number;
  period: { from: string; to: string };
  totalAccesses: number;
  compliant: number;
  violations: number;
  details: ComplianceDetail[];
}

export interface AnomalyResponse {
  traceId: string;
  timestamp: string;
  clientId: string;
  dataSubjectId: number;
  dataCategory: string;
  purpose: string;
  violationReason: ViolationReason;
}

export interface StatsResponse {
  totalAllows: number;
  totalDenies: number;
  byCategory: Record<string, number>;
  byClient: Record<string, number>;
  byPurpose: Record<string, number>;
}

export interface AccessProofFlowItem {
  service: string;
  resource: string;
  endpoint: string;
  method: string;
  decision: string;
  deniedReason: string | null;
  purpose: string | null;
  dataSubjectId: number | null;
  clientId: string | null;
  dataCategories: string[];
  timestamp: string;
}

export interface GrantedByEvent {
  eventId: string;
  timestamp: string;
}

export interface ConsentProofItem {
  dataCategory: string;
  purpose: string;
  statusAtAccessTime: string;
  grantedByEvent: GrantedByEvent;
  legitimate: boolean;
  violationReason: ViolationReason | null;
}

export interface AccessProofResponse {
  traceId: string;
  flow: AccessProofFlowItem[];
  consentProof: ConsentProofItem[];
  verdict: string;
}
