import { config } from '@/lib/config';
import type { PaymentGateway } from './gateway';

/**
 * Moyasar scaffold (Saudi gateway: Mada, Apple Pay, Visa/Mastercard, STC Pay).
 * Uses Moyasar's hosted "invoice" flow so no card data touches our servers.
 * Docs: https://docs.moyasar.com — set MOYASAR_SECRET_KEY to enable.
 */
const API = 'https://api.moyasar.com/v1';

function authHeader() {
  return 'Basic ' + Buffer.from(`${config.payments.moyasarSecretKey}:`).toString('base64');
}

export const moyasarGateway: PaymentGateway = {
  name: 'moyasar',
  supportedMethods: ['mada', 'applepay', 'visa', 'mastercard', 'stcpay'],
  async createCheckout(input) {
    if (!config.payments.moyasarSecretKey) throw new Error('MOYASAR_SECRET_KEY غير مضبوط');
    const res = await fetch(`${API}/invoices`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: authHeader() },
      body: JSON.stringify({
        amount: Math.round(input.amount * 100), // halalas
        currency: input.currency,
        description: input.description,
        callback_url: input.returnUrl,
        metadata: { payment_id: input.paymentId },
      }),
    });
    if (!res.ok) throw new Error(`moyasar ${res.status}`);
    const inv = (await res.json()) as { id: string; url: string };
    return { redirectUrl: inv.url, gatewayReference: inv.id };
  },
  async verify(_paymentId, gatewayReference) {
    if (!gatewayReference) return { status: 'pending' };
    const res = await fetch(`${API}/invoices/${gatewayReference}`, { headers: { authorization: authHeader() } });
    if (!res.ok) return { status: 'pending' };
    const inv = (await res.json()) as { status: string; payments?: { source?: { type?: string; company?: string } }[] };
    const paid = inv.status === 'paid';
    const src = inv.payments?.[0]?.source;
    const method = src?.type === 'applepay' ? 'applepay' : src?.type === 'stcpay' ? 'stcpay' : src?.company === 'mada' ? 'mada' : src?.company === 'visa' ? 'visa' : src?.company === 'master' ? 'mastercard' : undefined;
    return { status: paid ? 'succeeded' : inv.status === 'failed' ? 'failed' : 'pending', gatewayReference, method, raw: inv };
  },
};
