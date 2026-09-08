'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowUpDown, BadgeCheck, Building2, Clock, ShieldCheck, MessageSquare, ChevronDown, Award, Zap, Star, Gem, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Stars, Avatar } from '@/components/ui/misc';
import { Select } from '@/components/ui/input';
import { selectSupplierAction } from '@/actions/selection';
import { startConversationAction } from '@/actions/chat';
import { formatSAR, pluralDays, cn } from '@/lib/utils';
import type { CustomerQuotationView } from '@/lib/services/quotations';
import { BADGE_LABELS, type QuotationBadge } from '@/lib/domain/labels';

type Q = CustomerQuotationView;
type SortKey = 'recommended' | 'price_asc' | 'price_desc' | 'rating' | 'delivery' | 'experience';

const BADGE_ICON: Record<QuotationBadge, React.ComponentType<{ className?: string }>> = { best_rated: Award, fastest: Zap, featured: Gem, best_value: Star };

export function QuotationCompare({ quotations, requestId, canSelect, selectedSupplierId }: { quotations: Q[]; requestId: string; canSelect: boolean; selectedSupplierId: string | null }) {
  const router = useRouter();
  const [sort, setSort] = useState<SortKey>('recommended');
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [confirm, setConfirm] = useState<Q | null>(null);
  const [pending, start] = useTransition();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const list = useMemo(() => {
    let arr = [...quotations];
    if (onlyVerified) arr = arr.filter((q) => q.supplier.verified);
    const by: Record<SortKey, (a: Q, b: Q) => number> = {
      recommended: (a, b) => b.badges.length - a.badges.length || b.supplier.ratingAvg - a.supplier.ratingAvg,
      price_asc: (a, b) => Number(a.price) - Number(b.price),
      price_desc: (a, b) => Number(b.price) - Number(a.price),
      rating: (a, b) => b.supplier.ratingAvg - a.supplier.ratingAvg || b.supplier.ratingCount - a.supplier.ratingCount,
      delivery: (a, b) => (a.delivery_days ?? 999) - (b.delivery_days ?? 999),
      experience: (a, b) => b.supplier.yearsExperience - a.supplier.yearsExperience,
    };
    return arr.sort(by[sort]);
  }, [quotations, sort, onlyVerified]);

  const openChat = (q: Q) => {
    if (q.conversation_id) return router.push(`/chat/${q.conversation_id}`);
    start(async () => {
      const res = await startConversationAction(requestId, q.supplier_id);
      if (!res.ok) { toast.error(res.error); return; }
      router.push(`/chat/${res.data.conversationId}`);
    });
  };

  const doSelect = () => {
    if (!confirm) return;
    const q = confirm;
    start(async () => {
      const res = await selectSupplierAction(q.id);
      setConfirm(null);
      if (!res.ok) { toast.error(res.error); return; }
      toast.success('تم إبلاغ المزود باختيارك. ستصلك بياناته فور فتحه للتواصل.');
      router.refresh();
    });
  };

  if (!quotations.length) return null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="size-4 text-muted" />
          <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-9 w-auto min-w-40 text-xs">
            <option value="recommended">الترتيب المقترح</option>
            <option value="price_asc">السعر: من الأقل</option>
            <option value="price_desc">السعر: من الأعلى</option>
            <option value="rating">الأعلى تقييمًا</option>
            <option value="delivery">الأسرع تنفيذًا</option>
            <option value="experience">الأكثر خبرة</option>
          </Select>
        </div>
        <label className="inline-flex items-center gap-2 text-xs text-ink-2">
          <input type="checkbox" checked={onlyVerified} onChange={(e) => setOnlyVerified(e.target.checked)} className="size-4 accent-primary" /> الموثّقون فقط
        </label>
        <span className="ms-auto text-xs text-muted">{list.length} من {quotations.length} عروض</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((q) => {
          const isSelected = selectedSupplierId === q.supplier_id;
          const open = expanded[q.id];
          return (
            <article key={q.id} className={cn('flex flex-col rounded-lg border bg-surface p-4 shadow-card', isSelected ? 'border-success ring-2 ring-success/20' : 'border-line')}>
              {q.badges.length ? (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {q.badges.map((b) => {
                    const I = BADGE_ICON[b];
                    return (
                      <Badge key={b} tone={b === 'featured' ? 'accent' : 'primary'}>
                        <I className="size-3" /> {BADGE_LABELS[b]}
                      </Badge>
                    );
                  })}
                </div>
              ) : null}
              <div className="flex items-start gap-3">
                {q.supplier.isIdentityRevealed ? (
                  <Avatar name={q.supplier.displayName} src={q.supplier.logoFileId ? `/api/files/${q.supplier.logoFileId}` : null} />
                ) : (
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-canvas-2 text-muted"><Building2 className="size-5" /></span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {q.supplier.slug ? (
                      <Link href={`/suppliers/${q.supplier.slug}`} className="font-semibold leading-snug text-ink hover:text-primary">{q.supplier.displayName}</Link>
                    ) : (
                      <span className="font-semibold leading-snug text-ink">{q.supplier.displayName}</span>
                    )}
                    {q.supplier.verified ? <BadgeCheck className="size-4 text-success" aria-label="موثّق" /> : null}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                    <Stars value={q.supplier.ratingAvg} count={q.supplier.ratingCount} />
                    <span>{q.supplier.yearsExperience} سنوات خبرة</span>
                    <span>{q.supplier.wonCount} مشروع</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <div className="text-2xl font-bold text-ink tabular">{formatSAR(q.price)}</div>
                {q.status === 'updated' ? <Badge tone="info">عرض محدّث</Badge> : null}
                {isSelected ? <Badge tone="success">اخترت هذا العرض</Badge> : null}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-canvas px-2.5 py-2">
                  <dt className="flex items-center gap-1 text-muted"><Clock className="size-3.5" /> مدة التنفيذ</dt>
                  <dd className="mt-0.5 font-medium text-ink">{q.delivery_days ? pluralDays(q.delivery_days) : 'غير محددة'}</dd>
                </div>
                <div className="rounded-md bg-canvas px-2.5 py-2">
                  <dt className="flex items-center gap-1 text-muted"><ShieldCheck className="size-3.5" /> الضمان</dt>
                  <dd className="mt-0.5 font-medium text-ink">{q.warranty || 'بدون'}</dd>
                </div>
                <div className="col-span-2 rounded-md bg-canvas px-2.5 py-2">
                  <dt className="text-muted">صلاحية العرض</dt>
                  <dd className="mt-0.5 font-medium text-ink">{pluralDays(q.validity_days)} من تاريخ التقديم</dd>
                </div>
              </dl>

              <div className="mt-3 text-sm text-ink-2">
                <p className={cn(!open && 'line-clamp-3')}>{q.details}</p>
                {open ? (
                  <div className="mt-2 space-y-2">
                    {q.price_includes ? (
                      <div>
                        <div className="text-xs font-semibold text-ink">ما يشمله السعر</div>
                        <p className="text-sm">{q.price_includes}</p>
                      </div>
                    ) : null}
                    {q.notes ? (
                      <div>
                        <div className="text-xs font-semibold text-ink">ملاحظات</div>
                        <p className="text-sm">{q.notes}</p>
                      </div>
                    ) : null}
                    {q.attachments.length ? (
                      <ul className="flex flex-wrap gap-1.5">
                        {q.attachments.map((a) => (
                          <li key={a.file_id}>
                            <a href={`/api/files/${a.file_id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-primary hover:bg-primary-soft">
                              <Paperclip className="size-3" /> {a.original_name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
                <button type="button" onClick={() => setExpanded({ ...expanded, [q.id]: !open })} className="mt-1 inline-flex items-center gap-1 text-xs text-primary">
                  {open ? 'عرض أقل' : 'كل التفاصيل'} <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
                </button>
              </div>

              <div className="mt-auto flex flex-col gap-2 pt-4">
                {canSelect && !selectedSupplierId ? (
                  <Button onClick={() => setConfirm(q)} disabled={pending}>
                    أرغب بالتعامل مع هذا المزود
                  </Button>
                ) : null}
                <Button variant="secondary" onClick={() => openChat(q)} disabled={pending}>
                  <MessageSquare /> محادثة مع المزود
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent title="هل ترغب بالانتقال للمرحلة التالية مع هذا المزود؟" description="سيتم إبلاغ المزود باختيارك. تبقى بياناتك محمية حتى يفتح المزود بيانات التواصل، وعندها تصلك بياناته أيضًا.">
          {confirm ? (
            <div className="rounded-md bg-canvas p-3 text-sm">
              <div className="font-semibold text-ink">{confirm.supplier.displayName}</div>
              <div className="text-muted">
                {formatSAR(confirm.price)} • {confirm.delivery_days ? pluralDays(confirm.delivery_days) : 'مدة غير محددة'}
              </div>
            </div>
          ) : null}
          <p className="mt-3 text-xs text-muted">ستُغلق العروض الأخرى لهذا الطلب. يمكنك إلغاء الاختيار بالتواصل مع الدعم إذا لم يستجب المزود.</p>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setConfirm(null)} disabled={pending}>
              تراجع
            </Button>
            <Button onClick={doSelect} loading={pending}>
              نعم، اختر هذا المزود
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
