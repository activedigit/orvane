import { LayoutDashboard, FileText, Inbox, MessageSquare, UserCheck, Star, Bell, User, Wallet, CreditCard, BadgeCheck, Building2, Users, ShieldCheck, Layers, MapPin, Receipt, Tag, BarChart3, Flag, Ban, Megaphone, Settings, Coins, ScrollText, Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const NAV_ICONS = {
  dashboard: LayoutDashboard, requests: FileText, quotations: Inbox, messages: MessageSquare, selected: UserCheck, reviews: Star, notifications: Bell, account: User,
  credits: Coins, payments: Receipt, subscription: CreditCard, profile: Building2, verification: BadgeCheck, users: Users, security: ShieldCheck, categories: Layers,
  cities: MapPin, pricing: Tag, analytics: BarChart3, reports: Flag, blocked: Ban, broadcast: Megaphone, settings: Settings, chats: ScrollText, wallet: Wallet, leads: Lock,
} satisfies Record<string, LucideIcon>;

export type NavIconName = keyof typeof NAV_ICONS;
