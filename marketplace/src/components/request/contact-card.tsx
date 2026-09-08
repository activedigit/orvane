import { Phone, Mail, Globe, MessageCircle, User } from 'lucide-react';

export function ContactCard({ title, name, phone, whatsapp, email, website, note }: { title: string; name: string; phone?: string | null; whatsapp?: string | null; email?: string | null; website?: string | null; note?: string }) {
  const wa = whatsapp ? whatsapp.replace(/\D/g, '').replace(/^0/, '966') : null;
  return (
    <div className="rounded-lg border border-success/30 bg-success-soft/40 p-4">
      <div className="text-xs font-semibold text-success">{title}</div>
      <div className="mt-1 flex items-center gap-2 text-base font-bold text-ink">
        <User className="size-4 text-muted" /> {name}
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {phone ? (
          <li>
            <a href={`tel:${phone}`} className="flex items-center gap-2 rounded-md bg-surface px-3 py-2 text-sm text-ink hover:text-primary">
              <Phone className="size-4 text-muted" /> <span className="ltr tabular">{phone}</span>
            </a>
          </li>
        ) : null}
        {wa ? (
          <li>
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md bg-surface px-3 py-2 text-sm text-ink hover:text-primary">
              <MessageCircle className="size-4 text-muted" /> واتساب
            </a>
          </li>
        ) : null}
        {email ? (
          <li>
            <a href={`mailto:${email}`} className="flex items-center gap-2 rounded-md bg-surface px-3 py-2 text-sm text-ink hover:text-primary">
              <Mail className="size-4 text-muted" /> <span className="ltr truncate">{email}</span>
            </a>
          </li>
        ) : null}
        {website ? (
          <li>
            <a href={website} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md bg-surface px-3 py-2 text-sm text-ink hover:text-primary">
              <Globe className="size-4 text-muted" /> <span className="ltr truncate">{website.replace(/^https?:\/\//, '')}</span>
            </a>
          </li>
        ) : null}
      </ul>
      {note ? <p className="mt-2 text-xs text-muted">{note}</p> : null}
    </div>
  );
}
