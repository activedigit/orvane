import 'server-only';
import { config } from '@/lib/config';
import { mockGateway } from './mock';
import type { PaymentGateway } from './gateway';

export type * from './gateway';
export { PAYMENT_METHOD_LABELS } from './gateway';

export async function getPaymentGateway(): Promise<PaymentGateway> {
  if (config.payments.gateway === 'moyasar') {
    const { moyasarGateway } = await import('./moyasar');
    return moyasarGateway;
  }
  return mockGateway;
}
