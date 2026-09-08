'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MobileNav({ nav, user }: { nav: { href: string; label: string }[]; user: { role: string; home: string } | null }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button onClick={() => setOpen((v) => !v)} className="rounded-md p-2 text-ink-2 hover:bg-canvas-2" aria-label="القائمة" aria-expanded={open}>
        {open ? <X className="size-6" /> : <Menu className="size-6" />}
      </button>
      {open ? (
        <div className="absolute inset-x-0 top-16 z-50 border-b border-line bg-surface p-4 shadow-pop fade-up">
          <nav className="flex flex-col gap-1">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-medium text-ink hover:bg-canvas-2">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 grid grid-cols-1 gap-2 border-t border-line pt-3">
            <Button asChild onClick={() => setOpen(false)}>
              <Link href="/requests/new">ابدأ طلبك</Link>
            </Button>
            {user ? (
              <Button asChild variant="secondary" onClick={() => setOpen(false)}>
                <Link href={user.home}>لوحة التحكم</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="secondary" onClick={() => setOpen(false)}>
                  <Link href="/login">تسجيل الدخول</Link>
                </Button>
                <Button asChild variant="ghost" onClick={() => setOpen(false)}>
                  <Link href="/register/supplier">سجّل كمزود خدمة</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
