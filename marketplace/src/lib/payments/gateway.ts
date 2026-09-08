export type PaymentMethod = 'mada' | 'applepay' | 'visa' | 'mastercard' | 'stcpay';

export interface CheckoutInput {
  paymentId: string;
  amount: number;          // SAR
  currency: string;
  description: string;
  customerEmail?: string | null;
  returnUrl: string;       // where the gateway sends the user back
  method?: PaymentMethod;
}

export interface CheckoutSession {
  /** URL to redirect the payer to (hosted page or internal mock page). */
  redirectUrl: string;
  gatewayReference?: string;
}

export interface VerifyResult { status: 'succeeded' | 'failed' | 'pending'; gatewayReference?: string; method?: PaymentMethod; raw?: unknown }

/**
 * Payment gateway abstraction. Implementations: `mock` (built-in) and
 * scaffolds for Saudi gateways (Moyasar/Tap/HyperPay support Mada, Apple Pay,
 * Visa/Mastercard and STC Pay). The rest of the platform only talks to
 * this interface, so switching gateway is a config change.
 */
export interface PaymentGateway {
  readonly name: string;
  readonly supportedMethods: PaymentMethod[];
  createCheckout(input: CheckoutInput): Promise<CheckoutSession>;
  /** Verify a payment after return/webhook, by our payment id and/or gateway reference. */
  verify(paymentId: string, gatewayReference?: string | null): Promise<VerifyResult>;
  /** Parse + validate a webhook payload. Returns null when signature invalid. */
  parseWebhook?(rawBody: string, headers: Record<string, string>): Promise<{ paymentId: string; result: VerifyResult } | null>;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  mada: 'مدى',
  applepay: 'Apple Pay',
  visa: 'Visa',
  mastercard: 'Mastercard',
  stcpay: 'STC Pay',
};
