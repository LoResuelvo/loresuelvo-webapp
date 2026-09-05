import { AuthSession } from "../../infrastructure/auth/types";
import {
  Category,
  ApiConversation,
  ApiConversationDetail,
  ApiConversationMessage, ApiAiConversationMessage,
  ApiAiConversation,
  ApiAiConversationDetail,
} from "../../infrastructure/api/types";

export interface MockCounterpart {
  id: number;
  role: "consumer" | "provider" | string;
  name: string;
  surname: string;
  category_name?: string;
  profile_photo_url?: string;
}

export interface MockProposalStub {
  id: number;
  conversation_id: number;
  consumer_id: number;
  provider_id: number;
  amount_cents: number;
  scheduled_on: string;
  description: string;
  estimated_duration_minutes?: number;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  created_on: string;
  counterpart?: MockCounterpart;
  booking_terms?: any;
}

export interface MockCompletionImage {
  file_id: string;
  original_name: string;
  url: string;
}

export interface MockCompletionReport {
  id: number;
  description: string;
  reported_on: string;
  images: MockCompletionImage[];
}

export interface MockReview {
  rating: number;
  description?: string;
  comment?: string;
}

export interface MockWorkOrderStub {
  id: number;
  service_proposal_id: number;
  consumer_id?: number;
  provider_id?: number;
  status: "scheduled" | "awaiting_payment" | "paid";
  amount_cents: number;
  scheduled_on: string;
  description: string;
  estimated_duration_minutes?: number;
  accepted_on: string;
  paid_on?: string;
  completion_report?: MockCompletionReport;
  review?: MockReview;
}

export interface MockCoverageZone {
  id: number;
  name: string;
  boundary?: {
    type: string;
    place_id: string;
  };
}

// ----------------------------------------------------------------------------
// FACTORIES
// ----------------------------------------------------------------------------

export function aSession(
  role: "consumer" | "provider" = "consumer",
  overrides: Partial<AuthSession["user"]> = {}
): AuthSession {
  return {
    user: {
      id: role === "consumer" ? "consumer-001" : "provider-001",
      email: role === "consumer" ? "consumidor@loresuelvo.test" : "prestador@loresuelvo.test",
      firstName: role === "consumer" ? "Ana" : "Juan",
      lastName: role === "consumer" ? "Pérez" : "Gómez",
      isOnboarded: true,
      role,
      ...overrides,
    },
    accessToken: "mock-access-token",
  };
}

export function aCurrentUser(
  role: "consumer" | "provider" = "consumer",
  overrides: Partial<any> = {}
) {
  const base = {
    id: role === "consumer" ? 1 : 2,
    name: role === "consumer" ? "Ana" : "Juan",
    surname: role === "consumer" ? "Pérez" : "Gómez",
    email: role === "consumer" ? "consumidor@loresuelvo.test" : "prestador@loresuelvo.test",
    role,
    profile_photo: null,
  };

  if (role === "provider") {
    return {
      ...base,
      category: {
        id: 1,
        name: "Plomería",
      },
      ...overrides,
    };
  }

  return {
    ...base,
    ...overrides,
  };
}

export function aPresignedUpload(overrides: Partial<any> = {}) {
  return {
    file_id: "test-file-id",
    key: "test-key",
    upload_url: "http://localhost:3001/mock-s3-upload",
    headers: {},
    ...overrides,
  };
}

export function aConfirmedFile(overrides: Partial<any> = {}) {
  return {
    id: "test-file-id",
    url: "http://localhost:3001/mock-s3-url/avatar.png",
    original_name: "avatar.png",
    ...overrides,
  };
}

export function aConsumer(overrides: Partial<any> = {}) {
  return {
    id: 1,
    name: "Ana",
    surname: "Pérez",
    email: "consumidor@loresuelvo.test",
    role: "consumer",
    profile_photo: null,
    profile_photo_url: "http://localhost:3001/mock-avatar.png",
    ...overrides,
  };
}

export function aPaymentAccount(overrides: Partial<any> = {}) {
  return {
    status: "pending",
    can_receive_payments: false,
    can_send_service_proposals: false,
    ...overrides,
  };
}

export function aConnectedPaymentAccount(overrides: Partial<any> = {}) {
  return aPaymentAccount({
    status: "connected",
    account_id: "mp-test",
    can_receive_payments: true,
    can_send_service_proposals: true,
    ...overrides,
  });
}

export function aPaymentAuthorization(overrides: Partial<any> = {}) {
  return {
    authorization_url: "https://auth.mercadopago.com/authorization?state=test-state",
    state: "test-state",
    ...overrides,
  };
}

export function aCategory(overrides: Partial<any> = {}) {
  return {
    id: 1,
    name: "Plomería",
    description: "Servicios de plomería y cañerías",
    icon_url: "http://localhost:3001/icons/plomeria.png",
    ...overrides,
  };
}

export function aProvider(overrides: Partial<any> = {}) {
  return {
    id: 1,
    name: "Juan",
    surname: "Gómez",
    category_name: "Plomería",
    category_id: 1,
    description: "Plomero matriculado con más de 10 años de experiencia",
    rating: 4.8,
    reviews: 12,
    jobs: 25,
    profile_photo_url: "http://localhost:3001/mock-avatar.png",
    ...overrides,
  };
}

interface ProviderSearchResultStub {
  id: number;
  name: string;
  surname: string;
  category_name: string;
  profile_photo_url?: string;
  rating_average: number;
  rating_count: number;
}

export function aProviderSearchResult(
  overrides: Partial<ProviderSearchResultStub> = {},
): ProviderSearchResultStub {
  return {
    id: 1,
    name: "Juan",
    surname: "Pérez",
    category_name: "Plomería",
    profile_photo_url: "http://localhost:3001/mock-avatar.png",
    rating_average: 0,
    rating_count: 0,
    ...overrides,
  };
}

export function aProviderProfile(overrides: Partial<any> = {}) {
  return {
    id: 1,
    name: "Juan",
    surname: "Gómez",
    profile_photo: {
      original_name: "juan-gomez.jpg",
      url: "http://localhost:3001/mock-provider-profile.jpg",
    },
    category: {
      id: 1,
      name: "Plomería",
    },
    rating_average: 4.8,
    rating_count: 12,
    work_orders: [],
    ...overrides,
  };
}

export function aProposal(
  role: "consumer" | "provider" = "consumer",
  overrides: Partial<MockProposalStub> = {}
): MockProposalStub {
  return {
    id: 42,
    conversation_id: 1,
    consumer_id: 10,
    provider_id: 1,
    amount_cents: 1500000,
    scheduled_on: "2026-08-20T10:00:00Z",
    description: "Reparación de cañería en cocina",
    estimated_duration_minutes: 60,
    status: "accepted",
    created_on: "2026-08-01T10:00:00Z",
    counterpart: {
      id: role === "consumer" ? 1 : 10,
      role: role === "consumer" ? "provider" : "consumer",
      name: role === "consumer" ? "Juan" : "Ana",
      surname: role === "consumer" ? "Gómez" : "Pérez",
      category_name: role === "consumer" ? "Plomería" : undefined,
    },
    ...overrides,
  };
}

export function aBookingTerms(amountCents: number, overrides: Partial<any> = {}) {
  const depositCents = Math.round(amountCents * 0.2);
  const remainingServiceBalanceCents = amountCents - depositCents;
  const platformFeeTotalCents = Math.round(amountCents * 0.05);
  const platformFeeDueNowCents = Math.round(platformFeeTotalCents * 0.2);
  const remainingPlatformFeeCents = platformFeeTotalCents - platformFeeDueNowCents;
  const amountDueNowCents = depositCents + platformFeeDueNowCents;
  const remainingAmountDueCents = remainingServiceBalanceCents + remainingPlatformFeeCents;
  const contractTotalCents = amountCents + platformFeeTotalCents;

  return {
    currency: "ARS" as const,
    service_total_cents: amountCents,
    deposit_cents: depositCents,
    remaining_service_balance_cents: remainingServiceBalanceCents,
    platform_fee_total_cents: platformFeeTotalCents,
    platform_fee_due_now_cents: platformFeeDueNowCents,
    remaining_platform_fee_cents: remainingPlatformFeeCents,
    amount_due_now_cents: amountDueNowCents,
    remaining_amount_due_cents: remainingAmountDueCents,
    contract_total_cents: contractTotalCents,
    booking_payment_deadline: "2026-08-31T12:00:00Z",
    ...overrides,
  };
}

export function aCheckoutSession(overrides: Partial<any> = {}) {
  return {
    payment_intent_id: "intent-e2e-123",
    status: "checkout_ready",
    checkout_url: "https://www.mercadopago.com.ar/checkout?pref_id=e2e-123",
    expires_on: "2026-08-11T20:30:00Z",
    pricing: {
      currency: "ARS",
      deposit_cents: 2_000_000,
      platform_fee_due_now_cents: 100_000,
      amount_due_now_cents: 2_100_000,
    },
    ...overrides,
  };
}

export function aServiceBalanceCheckoutSession(overrides: Partial<any> = {}) {
  return {
    payment_intent_id: "intent-e2e-balance-123",
    status: "checkout_ready",
    checkout_url: "https://www.mercadopago.com.ar/checkout?pref_id=balance-123",
    expires_on: "2026-08-25T20:30:00Z",
    pricing: {
      currency: "ARS",
      remaining_service_balance_cents: 8_000_000,
      remaining_platform_fee_cents: 400_000,
      amount_due_now_cents: 8_400_000,
    },
    ...overrides,
  };
}

export function aPaymentIntent(status: string = "pending", overrides: Partial<any> = {}) {
  return {
    status,
    ...overrides,
  };
}

export function aWorkOrder(overrides: Partial<MockWorkOrderStub> = {}): MockWorkOrderStub {
  return {
    id: 10,
    service_proposal_id: 42,
    consumer_id: 10,
    provider_id: 1,
    status: "scheduled",
    amount_cents: 1500000,
    scheduled_on: "2026-08-20T10:00:00Z",
    description: "Reparación de cañería en cocina",
    estimated_duration_minutes: 60,
    accepted_on: "2026-08-05T10:00:00Z",
    ...overrides,
  };
}

export function aCompletionReport(overrides: Partial<MockCompletionReport> = {}): MockCompletionReport {
  return {
    id: 1,
    description: "Trabajo finalizado correctamente y verificado.",
    reported_on: "2026-08-20T12:00:00Z",
    images: [
      {
        file_id: "file-01",
        original_name: "evidencia_1.jpg",
        url: "https://placehold.co/600x400/png?text=Evidencia+1",
      },
      {
        file_id: "file-02",
        original_name: "evidencia_2.jpg",
        url: "https://placehold.co/600x400/png?text=Evidencia+2",
      },
    ],
    ...overrides,
  };
}

export function aCompletionReportSubmission(overrides: Partial<any> = {}) {
  return {
    id: 1,
    work_order_id: 10,
    description: "Trabajo finalizado exitosamente.",
    image_file_ids: ["mock-completion-file-id"],
    created_on: new Date().toISOString(),
    ...overrides,
  };
}

export function aReview(overrides: Partial<MockReview> = {}): MockReview {
  return {
    rating: 5,
    comment: "excelente servicio, muy puntual y prolijo",
    description: "excelente servicio, muy puntual y prolijo",
    ...overrides,
  };
}

export function aConversation(overrides: Partial<ApiConversation> = {}): ApiConversation {
  return {
    id: 1,
    status: "active",
    counterpart: {
      id: 1,
      role: "provider",
      name: "Juan",
      surname: "Gómez",
      category_name: "Plomería",
      profile_photo_url: "http://localhost:3001/mock-avatar.png",
    },
    last_message: {
      id: 1,
      sender_role: "provider",
      content: "Hola, ¿en qué te puedo ayudar?",
      created_on: "2026-08-20T10:00:00Z",
    },
    updated_on: "2026-08-20T10:00:00Z",
    ...overrides,
  };
}

export function aConversationDetail(overrides: Partial<ApiConversationDetail> = {}): ApiConversationDetail {
  return {
    id: 1,
    status: "accepted",
    counterpart: {
      id: 1,
      role: "provider",
      name: "Juan",
      surname: "Gómez",
      category_name: "Plomería",
      profile_photo_url: "http://localhost:3001/mock-avatar.png",
    },
    messages: [
      {
        id: 1,
        sender_role: "consumer",
        content: "Hola Juan, necesito reparar una pérdida de agua.",
        created_on: new Date().toISOString(),
      },
    ],
    updated_on: new Date().toISOString(),
    ...overrides,
  };
}

export function aConversationMessage(overrides: Partial<ApiConversationMessage> = {}): ApiConversationMessage {
  return {
    id: 1,
    sender_role: "consumer",
    content: "Hola, tengo una pérdida de agua en el baño.",
    created_on: "2026-08-20T10:00:00Z",
    ...overrides,
  };
}

export function aAiConversation(overrides: Partial<ApiAiConversation> = {}): ApiAiConversation {
  return {
    id: 1,
    status: "active",
    title: "Pérdida de agua",
    last_message: {
      id: 2,
      sender_role: "chatbot",
      content: "Revisá si el agua sale desde la rosca del sifón.",
      created_on: "2026-06-18T10:00:01Z",
    },
    updated_on: "2026-06-18T10:00:01Z",
    ...overrides,
  };
}

export function aAiConversationDetail(overrides: Partial<ApiAiConversationDetail> = {}): ApiAiConversationDetail {
  return {
    id: 1,
    status: "active",
    title: "Pérdida de agua",
    response_status: "answered",
    messages: [
      {
        id: 1,
        sender_role: "consumer",
        content: "Se está filtrando agua debajo de la bacha",
        created_on: "2026-06-18T10:00:00Z",
      },
      {
        id: 2,
        sender_role: "chatbot",
        content: "Revisá si el agua sale desde la rosca del sifón.",
        created_on: "2026-06-18T10:00:01Z",
      },
    ],
    recommended_providers: [],
    ...overrides,
  };
}

export function aJobRequest(overrides: Partial<any> = {}) {
  return {
    id: 1,
    conversation_id: 1,
    title: "Reparación de cañería",
    description: "Pérdida de agua continua bajo bacha",
    status: "pending",
    category_id: 1,
    category_name: "Plomería",
    requester: {
      name: "Ana",
      surname: "Pérez",
    },
    consumer: {
      id: 10,
      name: "Ana",
      surname: "Pérez",
    },
    images: [],
    created_on: "2026-08-20T10:00:00Z",
    ...overrides,
  };
}

export function anAiMessage(overrides: Partial<ApiAiConversationMessage> = {}): ApiAiConversationMessage {
  return {
    id: 2,
    sender_role: "chatbot",
    content: "Revisá si el agua sale desde la rosca del sifón.",
    created_on: "2026-06-18T10:00:01Z",
    ...overrides,
  } as ApiAiConversationMessage;
}

export function aCounterpart(overrides: Partial<any> = {}) {
  return {
    id: 1,
    role: "consumer",
    name: "Ana",
    surname: "Pérez",
    category_name: "Plomería",
    ...overrides,
  };
}

export function aMessageImage(overrides: Partial<any> = {}) {
  return {
    id: "mock-file-123",
    url: "/image.jpg",
    original_name: "image.jpg",
    ...overrides,
  };
}

export function anApiError(error: string = "Internal Server Error") {
  return { error };
}

export function aWsTicket(ticket: string = "mock-ws-ticket-abc123") {
  return { ticket };
}

export function aCoverageZone(overrides: Partial<MockCoverageZone> = {}): MockCoverageZone {
  return {
    id: 6,
    name: "Comuna 6",
    boundary: {
      type: "admin_area_level_2",
      place_id: "ChIJRd-test-comuna-6",
    },
    ...overrides,
  };
}
