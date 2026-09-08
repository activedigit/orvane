import { ArrowDown } from 'lucide-react';

export function Funnel({ f }: { f: { created: number; dispatched: number; quoted: number; selected: number; unlocked: number; completed: number } }) {
  const steps = [
    ['طلب جديد', f.created], ['تم إرساله للمزودين', f.dispatched], ['عروض مستلمة', f.quoted], ['العميل اختار مزود', f.selected], ['تم شراء بيانات العميل', f.unlocked], ['المشروع مكتمل', f.completed],
  ] as const;
  const max = Math.max(1, f.created);
  return (
    <ol className="space-y-1.5">
      {steps.map(([label, v], i) => {
        const pct = Math.round((v / max) * 100);
        const prev = i > 0 ? steps[i - 1][1] : v;
        const conv = prev ? Math.round((v / prev) * 100) : 0;
        return (
          <li key={label}>
            {i > 0 ? <div className="flex items-center gap-1 ps-2 text-[11px] text-muted"><ArrowDown className="size-3" /> {conv}%</div> : null}
            <div className="relative h-9 overflow-hidden rounded-md bg-canvas-2">
              <div className="absolute inset-y-0 start-0 bg-primary/80" style={{ width: `${Math.max(pct, 2)}%` }} />
              <div className="relative flex h-full items-center justify-between px-3 text-sm">
                <span className="font-medium text-ink mix-blend-multiply">{label}</span>
                <span className="font-bold tabular text-ink">{v}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
