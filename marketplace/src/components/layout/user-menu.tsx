'use client';
import Link from 'next/link';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, LogOut, User, Home } from 'lucide-react';
import { Avatar } from '@/components/ui/misc';
import { logoutAction } from '@/actions/auth';
import type { SessionUser } from '@/lib/auth/types';

const ROLE_LABEL: Record<string, string> = { customer: 'عميل', supplier: 'مزود خدمة', admin: 'مدير' };

export function UserMenu({ user }: { user: SessionUser }) {
  const accountHref = user.role === 'admin' ? '/admin' : user.role === 'supplier' ? '/supplier/profile' : '/dashboard/account';
  return (
    <DropdownMenu.Root dir="rtl">
      <DropdownMenu.Trigger className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-canvas-2 focus:outline-none">
        <Avatar name={user.fullName} size="sm" />
        <span className="hidden text-sm font-medium text-ink sm:inline">{user.fullName.split(' ')[0]}</span>
        <ChevronDown className="size-4 text-muted" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className="z-50 min-w-48 rounded-md border border-line bg-surface p-1 shadow-pop fade-up">
          <div className="px-3 py-2">
            <div className="text-sm font-semibold text-ink">{user.fullName}</div>
            <div className="text-xs text-muted">{ROLE_LABEL[user.role]}</div>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item asChild>
            <Link href="/" className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm text-ink-2 outline-none hover:bg-canvas-2">
              <Home className="size-4" /> الصفحة الرئيسية
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link href={accountHref} className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm text-ink-2 outline-none hover:bg-canvas-2">
              <User className="size-4" /> الحساب
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item asChild>
            <form action={logoutAction}>
              <button type="submit" className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm text-danger outline-none hover:bg-danger-soft">
                <LogOut className="size-4" /> تسجيل الخروج
              </button>
            </form>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
