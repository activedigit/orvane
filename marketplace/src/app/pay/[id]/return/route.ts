import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@/lib/db';
import { getPaymentGateway } from '@/lib/payments';
import { fulfilPayment, failPayment } from '@/lib/services/unlock';

/** Return URL for real gateways: verify with the gateway then fulfil. The mock gateway confirms via server action instead. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL(`/login?next=/pay/${id}/return`, req.url));
  const [p] = await sql<{ id: string; user_id: string; status: string; gateway_reference: string | null; metadata: Record<string, string> }[]>`select id, user_id, status, gateway_reference, metadata from public.payments where id = ${id}`;
  if (!p || p.user_id !== user.id) return NextResponse.redirect(new URL('/supplier/payments', req.url));
  if (p.status !== 'succeeded') {
    const gateway = await getPaymentGateway();
    const ref = req.nextUrl.searchParams.get('id') || req.nextUrl.searchParams.get('invoice_id') || p.gateway_reference;
    const v = await gateway.verify(p.id, ref);
    if (v.status === 'succeeded') await fulfilPayment(p.id, { method: v.method, gatewayReference: v.gatewayReference });
    else if (v.status === 'failed') await failPayment(p.id);
    else return NextResponse.redirect(new URL(`/pay/${id}`, req.url));
  }
  const dest = p.metadata.selectionId ? `/supplier/leads/${p.metadata.selectionId}` : p.metadata.credits ? '/supplier/credits' : '/supplier/subscription';
  return NextResponse.redirect(new URL(dest, req.url));
}
