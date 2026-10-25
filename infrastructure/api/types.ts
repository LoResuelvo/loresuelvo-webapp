import { Category } from "@/domain/shared/types";
import { Provider } from "@/domain/provider/types";

export type { Category, Provider };

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface ApiStub {
  method: HttpMethod;
  endpoint: string;
  status: number;
  body: unknown;
  delayMs?: number;
}

export interface ApiActivityPeriod {
  from: string;
  to: string;
  granularity: "day" | "week" | "month";
  time_zone: "America/Argentina/Buenos_Aires";
}

export interface ApiActivityResults {
  confirmed_bookings: number;
  reported_completions: number;
  fully_paid_work_orders: number;
  clients_served: number;
  new_clients: number;
  returning_clients: number;
  agreed_value_cents: number;
  average_value_cents: number | null;
  currency: "ARS";
}

export interface ApiProviderActivity {
  period: ApiActivityPeriod;
  calculated_at: string;
  results: ApiActivityResults;
  evolution: Array<{
    from: string;
    to: string;
    confirmed_bookings: number;
    reported_completions: number;
    fully_paid_work_orders: number;
  }>;
  current_pending: {
    requests: number;
    scheduled_orders: number;
    awaiting_payment_orders: number;
  };
  comparison?: {
    period: ApiActivityPeriod;
    results: ApiActivityResults;
    changes: Record<Exclude<keyof ApiActivityResults, "currency">, { absolute: number | null; percentage: number | null }>;
  };
}

export interface ApiConversation {
  id: number;
  status: string;
  counterpart: {
    id: number;
    role: string;
    name: string;
    surname: string;
    category_name?: string;
    profile_photo_url?: string | null;
  };
  last_message?: {
    id: number;
    sender_role: string;
    content?: string;
    images?: ApiMessageImage[];
    audio?: ApiMessageAudio;
    video?: ApiMessageVideo;
    created_on: string;
  };
  updated_on: string;
}

export interface ApiProvider {
  identity_verified: boolean;
  id: number;
  name: string;
  surname: string;
  category_name: string;
  category_id?: number;
  description?: string;
  rating_average: number;
  rating_count: number;
  profile_photo_url?: string;
}

export interface ApiProviderProfile {
  identity_verified: boolean;
  id: number;
  name: string;
  surname: string;
  profile_photo: {
    original_name: string;
    url: string;
  };
  category: {
    id: number;
    name: string;
  };
  coverage_zones?: Array<{
    id: number;
    name: string;
  }>;
  rating_average: number;
  rating_count: number;
  work_orders: ApiProviderProfileWorkOrder[];
}

export interface ApiProviderProfileWorkOrder {
  id: number;
  scheduled_on: string;
  description: string;
  status: "scheduled" | "awaiting_payment" | "paid";
  completion_report: ApiProviderProfileCompletionReport;
  review?: ApiProviderProfileReview;
}

export interface ApiProviderProfileCompletionReport {
  description: string;
  reported_on: string;
}

export interface ApiProviderProfileReview {
  rating: number;
  description: string;
}

export interface ApiMessageImage {
  id: string;
  url: string;
  original_name: string;
}

export interface ApiServiceAddress {
  street: string;
  street_number: string;
  floor?: string;
  unit?: string;
}

export interface ApiJobRequestPayload {
  provider_id: number;
  title: string;
  description: string;
  image_file_ids?: string[];
}

export interface ApiJobRequestResponse {
  id: number;
  conversation_id: number;
  title: string;
  description: string;
  images?: ApiMessageImage[];
  service_address?: ApiServiceAddress | null;
  created_on?: string | null;
}

export interface ApiJobRequestSummary extends ApiJobRequestResponse {
  requester: { name: string; surname: string };
}

export interface ApiMessageAudio {
  id: string;
  url: string;
  original_name: string;
  duration_seconds: number;
  mime_type?: string;
  size_bytes?: number;
}

export interface ApiMessageVideo {
  id: string;
  url?: string;
  original_name: string;
  duration_seconds: number;
  thumbnail_url?: string;
  mime_type?: string;
  size_bytes?: number;
  width?: number;
  height?: number;
  codec?: string;
  audio_codec?: string | null;
}

export interface ApiConversationMessage {
  id: number;
  sender_role: string;
  content?: string;
  images?: ApiMessageImage[];
  audio?: ApiMessageAudio;
  video?: ApiMessageVideo;
  created_on: string;
}

export interface ApiConversationDetail {
  id: number;
  type?: string;
  status: string;
  counterpart?: {
    id: number | string;
    role: string;
    name: string;
    surname: string;
    category_name?: string;
    profile_photo_url?: string;
  };
  work?: {
    counterpart: {
      id: number | string;
      role: string;
      name: string;
      surname: string;
      category_name?: string;
      profile_photo_url?: string;
    };
  };
  messages: ApiConversationMessage[];
  updated_on: string;
}

export interface ApiAiConversation {
  id: number;
  status: string;
  title: string;
  last_message?: {
    id: number;
    sender_role: string;
    content: string;
    created_on: string;
  };
  updated_on: string;
}

export interface ApiAiConversationMessage {
  id: number;
  sender_role: string;
  content: string;
  created_on: string;
  images?: ApiMessageImage[];
}

export interface ApiRecommendedProvider {
  id: number;
  name: string;
  surname: string;
  category_name: string;
  profile_photo_url?: string;
}

export interface ApiProblemAssessment {
  outcome: string;
  problem_category?: {
    id: number;
    name: string;
  };
}

export interface ApiAiConversationDetail {
  id: number;
  status: string;
  title?: string;
  response_status?: string;
  diagnosis_completed?: boolean;
  assessment?: ApiProblemAssessment;
  recommended_category?: {
    id: number;
    name: string;
  };
  messages: ApiAiConversationMessage[];
  response?: ApiAiConversationMessage;
  recommended_providers?: ApiRecommendedProvider[];
  chatbot?: {
    title: string;
    response_status: string;
    diagnosis_completed?: boolean;
    assessment?: ApiProblemAssessment;
    recommended_category?: {
      id: number;
      name: string;
    };
    recommended_providers?: ApiRecommendedProvider[];
  };
}

export interface ApiCreateServiceProposalRequest {
  consumer_id: number;
  amount: string;
  scheduled_on: string;
  description: string;
  estimated_duration_minutes: number;
}

export interface ApiServiceProposal {
  id: number;
  conversation_id: number;
  consumer_id: number;
  provider_id: number;
  amount_cents: number;
  scheduled_on: string;
  description: string;
  estimated_duration_minutes?: number;
  status: string;
  booking_terms?: ApiBookingTerms;
}

export interface ApiServiceProposalCounterpart {
  id: number;
  role: string;
  name: string;
  surname: string;
  category_name?: string;
  profile_photo_url?: string;
}

export interface ApiServiceProposalSummary {
  id: number;
  conversation_id: number;
  amount_cents: number;
  scheduled_on: string;
  description: string;
  estimated_duration_minutes?: number;
  status: string;
  created_on: string;
  counterpart: ApiServiceProposalCounterpart;
  booking_terms?: ApiBookingTerms;
}

export interface ApiBookingTerms {
  currency: "ARS";
  service_total_cents: number;
  deposit_cents: number;
  remaining_service_balance_cents: number;
  platform_fee_total_cents: number;
  platform_fee_due_now_cents: number;
  remaining_platform_fee_cents: number;
  amount_due_now_cents: number;
  remaining_amount_due_cents: number;
  contract_total_cents: number;
  booking_payment_deadline: string;
}

export interface ApiPaymentPricing {
  currency: string;
  deposit_cents: number;
  platform_fee_due_now_cents: number;
  amount_due_now_cents: number;
}

export interface ApiServiceBalancePricing {
  currency: string;
  remaining_service_balance_cents: number;
  remaining_platform_fee_cents: number;
  amount_due_now_cents: number;
}

export interface ApiCheckoutSession {
  payment_intent_id: string;
  status: string;
  checkout_url: string;
  expires_on: string;
  pricing: ApiPaymentPricing;
}

export interface ApiServiceBalanceCheckoutSession {
  payment_intent_id: string;
  status: string;
  checkout_url: string;
  expires_on: string;
  pricing: ApiServiceBalancePricing;
}

export interface ApiPaymentIntent {
  status: string;
}

export interface ApiPaymentAccountConnection {
  status: string;
  account_id?: string;
  can_receive_payments: boolean;
  can_send_service_proposals: boolean;
}

export interface ApiPaymentAccountAuthorization {
  authorization_url: string;
  state: string;
}

export interface ApiCalendarAuthorization {
  authorization_url: string;
  state: string;
}

export interface ApiRegisterConsumerRequest {
  email: string;
  name: string;
  surname: string;
  address: {
    street: string;
    street_number: string;
    floor?: string;
    unit?: string;
  };
  profile_photo_file_id?: string;
}

export interface ApiRegisterConsumerResponse {
  id: number;
  name: string;
  surname: string;
  profile_photo_url?: string;
}

export interface ApiCurrentUserProfilePhoto {
  original_name: string;
  url: string;
}

export interface ApiCurrentUserCategory {
  id: number;
  name: string;
}

export interface ApiConsumerCurrentUserAddress extends ApiServiceAddress {
  latitude: number;
  longitude: number;
  coverage_zone_id: number;
}

export type ApiCalendarConnectionStatus =
  | "disconnected"
  | "connected"
  | "action_required";

interface ApiCurrentUserBaseResponse {
  id: number;
  name: string;
  surname: string;
  email: string;
  calendar_connection_status: ApiCalendarConnectionStatus;
  profile_photo?: ApiCurrentUserProfilePhoto | null;
}

export interface ApiConsumerCurrentUserResponse extends ApiCurrentUserBaseResponse {
  role: "consumer";
  address?: ApiConsumerCurrentUserAddress | null;
}

export interface ApiProviderCurrentUserResponse extends ApiCurrentUserBaseResponse {
  role: "provider";
  category: ApiCurrentUserCategory;
  identity_verification_status: string;
  identity_verified_on: string | null;
}

export interface ApiIdentityVerificationSessionResponse {
  session_id: string;
  session_token: string;
  verification_url: string;
  status: string;
}

export type ApiCurrentUserResponse =
  | ApiConsumerCurrentUserResponse
  | ApiProviderCurrentUserResponse;

export interface ApiWorkOrder {
  id: number;
  service_proposal_id: number;
  status: "scheduled" | "awaiting_payment" | "paid";
  amount_cents: number;
  scheduled_on: string;
  description: string;
  estimated_duration_minutes?: number;
  accepted_on: string;
}

export interface ApiCompletionReportInput {
  description: string;
  image_file_ids: string[];
}

export interface ApiCompletionReport {
  id: number;
  description: string;
  reported_on: string;
  images: ApiCompletionImage[];
}

export interface ApiCompletionImage {
  file_id: string;
  original_name: string;
  url: string;
}

export interface ApiCompletionReportDetail {
  id: number;
  description: string;
  reported_on: string;
  images: ApiCompletionImage[];
}

export interface CreateWorkOrderReviewRequest {
  rating: number;
  description?: string;
}

export interface CreateWorkOrderReviewResponse {
  rating: number;
  description?: string;
  comment?: string;
  created_on?: string;
}

export interface ApiWorkOrderReview {
  rating: number;
  description?: string;
  comment?: string;
  created_on?: string;
}

export type CreateWorkOrderReviewReportCategory =
  | "abusive_language"
  | "personal_data"
  | "spam_advertising"
  | "unrelated_content";

export interface CreateWorkOrderReviewReportRequest {
  category: CreateWorkOrderReviewReportCategory;
  explanation?: string;
}

export interface ApiWorkOrderDetail {
  id: number;
  service_proposal_id: number;
  consumer_id: number;
  provider_id: number;
  amount_cents: number;
  scheduled_on: string;
  description: string;
  estimated_duration_minutes?: number;
  status: "scheduled" | "awaiting_payment" | "paid";
  accepted_on: string;
  paid_on?: string;
  completion_report?: ApiCompletionReportDetail;
  review?: ApiWorkOrderReview;
}

export interface ApiCoverageZoneBoundary {
  type: string;
  place_id: string;
}

export interface ApiCoverageZone {
  id: number;
  name: string;
  boundary?: ApiCoverageZoneBoundary;
}

export interface ApiCollectionAmounts {
  booking_deposit_cents: number;
  service_balance_cents: number;
  total_cents: number;
}
export interface ApiCollectionPeriod {
  from: string;
  to: string;
  granularity: "day" | "week" | "month";
  time_zone: "America/Argentina/Buenos_Aires";
}
export interface ApiProviderCollections {
  period: ApiCollectionPeriod;
  calculated_at: string;
  currency: "ARS";
  results: ApiCollectionAmounts;
  evolution: (ApiCollectionAmounts & { from: string; to: string })[];
  current_pending: {
    scheduled: { orders: number; amount_cents: number };
    awaiting_payment: { orders: number; amount_cents: number };
  };
  comparison?: {
    period: ApiCollectionPeriod;
    results: ApiCollectionAmounts;
    changes: { [K in keyof ApiCollectionAmounts]: { absolute: number; percentage: number | null } };
  };
}

export interface ApiCollectionTransaction {
  id: number;
  verified_on: string;
  purpose: "booking_deposit" | "service_balance";
  seller_amount_cents: number;
  currency: "ARS";
  service_proposal_id: number;
  work_order_id: number;
}
export interface ApiCollectionTransactions {
  period: Omit<ApiCollectionPeriod, "granularity">;
  calculated_at: string;
  currency: "ARS";
  total_count: number;
  total_amount_cents: number;
  transactions: ApiCollectionTransaction[];
  next_cursor: string | null;
}

export interface ApiProviderReputation {
  calculated_at: string;
  average_rating: number | null;
  review_count: number;
  visible_review_count: number;
  rating_distribution: Array<{ rating: number; count: number }>;
  eligible_paid_orders: number;
  reviewed_paid_orders: number;
  coverage_percentage: number | null;
  reviews: Array<{ work_order_id: number; rating: number; description: string }>;
  next_cursor: string | null;
}

export interface ApiConversionRatio {
  numerator: number;
  denominator: number;
  percentage: number | null;
}

export interface ApiConversionStageRates {
  cohort: ApiConversionRatio;
  previous_stage: ApiConversionRatio;
}

export interface ApiConversionStages {
  issued: number;
  contracted: number;
  reported: number;
  paid: number;
}

export interface ApiConversionProposals {
  stages: ApiConversionStages;
  rates: {
    contracted: ApiConversionStageRates;
    reported: ApiConversionStageRates;
    paid: ApiConversionStageRates;
  };
  uncontracted: number;
}

export interface ApiConversionRequests {
  received: number;
  accepted: number;
  pending: number;
  acceptance_rate: ApiConversionRatio;
}

export interface ApiProviderConversion {
  period: {
    from: string;
    to: string;
    time_zone: string;
  };
  observed_at: string;
  proposals: ApiConversionProposals;
  requests: ApiConversionRequests;
}

export interface ApiRealtimeNotification {
  id: number;
  user_id: number;
  type: string;
  resource_type: string;
  resource_id: number;
  estimated_duration_minutes?: number;
  read_at?: string | null;
  created_at: string;
}

export interface ApiRealtimeJobRequestRequester {
  name: string;
  surname: string;
}

export interface ApiRealtimeJobRequestImage {
  id: string;
  original_name: string;
  url: string;
}

export interface ApiRealtimeJobRequest {
  id: number;
  conversation_id: number;
  title: string;
  description: string;
  status: string;
  requester: ApiRealtimeJobRequestRequester;
  images: ApiRealtimeJobRequestImage[];
}

export interface ApiNotificationCreatedEvent {
  type: "notification.created";
  notification: ApiRealtimeNotification;
  job_request?: ApiRealtimeJobRequest;
}



export type ApiClaimReference =
  | { job_request_id: number } | { service_proposal_id: number }
  | { work_order_id: number } | { payment_intent_id: string };
export interface ApiClaimSubmission {
  reference: ApiClaimReference;
  reason: "non_compliance" | "improper_charge" | "damage" | "poor_quality";
  description: string;
  image_file_ids: string[];
}
export interface ApiClaimAcknowledgment {
  id: number;
  operation_id: string;
  reference: ApiClaimReference;
  status: "open" | "in_review" | "resolved" | "dismissed";
  created_on: string;
}
export interface ApiClaimSummary extends ApiClaimAcknowledgment {
  reason: ApiClaimSubmission["reason"];
  review_started_on: string | null;
  closed_on: string | null;
}
export interface ApiClaimPage {
  items: ApiClaimSummary[];
  page: number;
  limit: number;
  total: number;
}

export interface ApiClaimResolution {
  type: "consumer_favor" | "provider_favor" | "agreement" | "without_merit";
  reasoning: string;
  resolved_on: string;
  suggested_compensation: { amount_minor: number; currency: "ARS"; unit: "minor" } | null;
}
export interface ApiClaimDetail extends ApiClaimSummary {
  description: string;
  images: { file_id: string; url: string }[];
  resolution: ApiClaimResolution | null;
}
