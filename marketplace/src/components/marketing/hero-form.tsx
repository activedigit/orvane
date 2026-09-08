'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function HeroForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 5) return;
    setLoading(true);
    router.push(`/requests/new?text=${encodeURIComponent(text.trim())}`);
  };
  return (
    <form onSubmit={submit} className="w-full">
      <div className="rounded-xl border border-line-2 bg-surface p-2 shadow-pop focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={compact ? 2 : 3}
          placeholder="مثال: أحتاج تركيب نظام كاميرات لمستودع في الرياض..."
          className="w-full resize-none border-0 bg-transparent px-3 py-2 text-base text-ink placeholder:text-muted focus:outline-none"
          aria-label="اكتب لنا الخدمة أو المشروع الذي تحتاجه"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) submit(e);
          }}
        />
        <div className="flex items-center justify-between gap-2 px-1 pb-1">
          <span className="hidden text-xs text-muted sm:inline">اكتب لنا الخدمة أو المشروع الذي تحتاجه...</span>
          <Button type="submit" size="lg" loading={loading} disabled={text.trim().length < 5} className="w-full sm:w-auto">
            ابدأ طلبك <ArrowLeft />
          </Button>
        </div>
      </div>
    </form>
  );
}
