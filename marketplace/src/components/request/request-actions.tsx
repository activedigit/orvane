'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cancelRequestAction, closeQuotationsAction, completeRequestAction } from '@/actions/requests';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/input';

export function RequestActions({ requestId, status }: { requestId: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const canCancel = ['draft', 'waiting_suppliers', 'receiving_quotations', 'reviewing_quotations'].includes(status);
  const canClose = ['waiting_suppliers', 'receiving_quotations'].includes(status);
  const canComplete = status === 'supplier_selected';
  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) { toast.error(res.error || 'خطأ'); return; }
      toast.success(msg);
      setCancelOpen(false);
      router.refresh();
    });
  if (!canCancel && !canComplete) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {canComplete ? (
        <Button onClick={() => act(() => completeRequestAction(requestId), 'تم تأكيد اكتمال المشروع')} loading={pending}>
          تم إنجاز المشروع
        </Button>
      ) : null}
      {canClose ? (
        <Button variant="secondary" onClick={() => act(() => closeQuotationsAction(requestId), 'تم إغلاق استقبال العروض')} disabled={pending}>
          إغلاق استقبال العروض
        </Button>
      ) : null}
      {canCancel ? (
        <Button variant="ghost" className="text-danger hover:bg-danger-soft" onClick={() => setCancelOpen(true)} disabled={pending}>
          إلغاء الطلب
        </Button>
      ) : null}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent title="إلغاء الطلب" description="سيتم إبلاغ المزودين بإلغاء الطلب ولن تتمكن من استقبال عروض جديدة.">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="سبب الإلغاء (اختياري)" rows={2} />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>تراجع</Button>
            <Button variant="destructive" onClick={() => act(() => cancelRequestAction(requestId, reason), 'تم إلغاء الطلب')} loading={pending}>تأكيد الإلغاء</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
