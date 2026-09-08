import type { PaymentGateway } from './gateway';

/**
 * Mock gateway: redirects to an internal checkout page where the payer
 * picks a method and confirms. Confirmation is done by a server action
 * that marks the payment succeeded and fulfils it. Never use in production.
 */
export const mockGateway: PaymentGateway = {
  name: 'mock',
  supportedMethods: ['mada', 'applepay', 'visa', 'mastercard', 'stcpay'],
  async createCheckout(input) {
    return { redirectUrl: `/pay/${input.paymentId}`, gatewayReference: `MOCK-${input.paymentId.slice(0, 8).toUpperCase()}` };
  },
  async verify(_paymentId, gatewayReference) {
    // The mock page confirms through a server action; verify is a no-op that trusts DB state.
    return { status: 'pending', gatewayReference: gatewayReference ?? undefined };
  },
};
