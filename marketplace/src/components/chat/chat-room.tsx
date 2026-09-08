'use client';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowRight, Send, Paperclip, Mic, Square, ShieldCheck, Lock, Flag, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { sendMessageAction } from '@/actions/chat';
import { reportAction } from '@/actions/profile';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/input';
import { uploadToServer } from '@/components/upload/file-uploader';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn, formatTime, formatDate } from '@/lib/utils';
import type { MessageView } from '@/lib/services/chat';

interface Props {
  conversationId: string;
  initialMessages: MessageView[];
  otherLabel: string;
  requestTitle: string;
  referenceCode: string;
  unlocked: boolean;
  backHref: string;
  requestHref: string;
  otherUserId: string;
  requestId: string;
  role: 'customer' | 'supplier' | 'admin';
}

export function ChatRoom(p: Props) {
  const [messages, setMessages] = useState<MessageView[]>(p.initialMessages);
  const [text, setText] = useState('');
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const lastRef = useRef<string | null>(p.initialMessages.at(-1)?.created_at ?? null);

  const scrollDown = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }));
  }, []);

  const fetchNew = useCallback(async () => {
    try {
      const url = `/api/chat/${p.conversationId}/messages${lastRef.current ? `?after=${encodeURIComponent(lastRef.current)}` : ''}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as { messages: MessageView[] };
      if (data.messages.length) {
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          const fresh = data.messages.filter((m) => !ids.has(m.id));
          if (!fresh.length) return prev;
          return [...prev, ...fresh];
        });
        lastRef.current = data.messages.at(-1)!.created_at;
        scrollDown();
      }
    } catch {}
  }, [p.conversationId, scrollDown]);

  // polling (works everywhere) + optional Supabase Realtime trigger
  useEffect(() => {
    scrollDown();
    const t = setInterval(fetchNew, 3500);
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      ?.channel(`conv-${p.conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${p.conversationId}` }, () => fetchNew())
      .subscribe();
    return () => {
      clearInterval(t);
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, [fetchNew, p.conversationId, scrollDown]);

  const send = (body: string, fileIds?: string[], kind?: 'text' | 'image' | 'file' | 'voice') =>
    start(async () => {
      const res = await sendMessageAction(p.conversationId, body, fileIds, kind);
      if (!res.ok) { toast.error(res.error); return; }
      setText('');
      setMessages((prev) => (prev.some((m) => m.id === res.data.message.id) ? prev : [...prev, res.data.message]));
      lastRef.current = res.data.message.created_at;
      if (res.data.filtered) toast.warning('تم إخفاء معلومات التواصل من رسالتك لحماية عملية التعاقد.');
      scrollDown();
    });

  const onFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    setUploading(true);
    try {
      const ids: string[] = [];
      let allImages = true;
      for (const f of Array.from(list)) {
        const up = await uploadToServer(f, 'message');
        ids.push(up.id);
        if (!up.mime.startsWith('image/')) allImages = false;
      }
      send('', ids, allImages ? 'image' : 'file');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل الرفع');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const toggleRecord = async () => {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { toast.error('المتصفح لا يدعم التسجيل الصوتي'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
        if (blob.size < 1000) return;
        setUploading(true);
        try {
          const up = await uploadToServer(new File([blob], `voice-${Date.now()}.webm`, { type: blob.type }), 'message');
          send('', [up.id], 'voice');
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'فشل رفع التسجيل');
        } finally {
          setUploading(false);
        }
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch {
      toast.error('تعذّر الوصول للميكروفون');
    }
  };

  let lastDay = '';

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col bg-canvas md:h-[calc(100dvh-6rem)] md:rounded-lg md:border md:border-line md:bg-surface">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-line bg-surface px-3 py-2.5">
        <Link href={p.backHref} className="rounded-md p-1.5 text-muted hover:bg-canvas-2" aria-label="رجوع">
          <ArrowRight className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 truncate text-sm font-semibold text-ink">
            {p.otherLabel}
            {p.unlocked ? <ShieldCheck className="size-4 text-success" /> : <Lock className="size-3.5 text-muted" />}
          </div>
          <Link href={p.requestHref} className="block truncate text-xs text-muted hover:text-primary">
            {p.referenceCode} • {p.requestTitle}
          </Link>
        </div>
        {p.role !== 'admin' ? (
          <button type="button" onClick={() => setReportOpen(true)} className="rounded-md p-1.5 text-muted hover:bg-canvas-2 hover:text-danger" aria-label="إبلاغ">
            <Flag className="size-4" />
          </button>
        ) : null}
      </div>

      {/* privacy banner */}
      {!p.unlocked ? (
        <div className="flex items-center gap-2 bg-warning-soft px-3 py-1.5 text-[11px] text-warning">
          <Lock className="size-3.5 shrink-0" /> محادثة مجهولة: يتم إخفاء أرقام الجوال والبريد والروابط تلقائيًا حتى يتم اختيار المزود وفتح البيانات.
        </div>
      ) : null}

      {/* messages */}
      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-4 scroll-thin">
        {messages.map((m) => {
          const day = formatDate(m.created_at);
          const showDay = day !== lastDay;
          lastDay = day;
          return (
            <div key={m.id}>
              {showDay ? <div className="my-3 text-center text-[11px] text-muted"><span className="rounded-full bg-canvas-2 px-2 py-0.5">{day}</span></div> : null}
              {m.kind === 'system' ? (
                <div className="mx-auto max-w-md rounded-md bg-canvas-2 px-3 py-2 text-center text-[11px] text-ink-2">{m.body}</div>
              ) : (
                <div className={cn('flex', m.is_mine ? 'justify-start' : 'justify-end')}>
                  <div className={cn('max-w-[85%] px-3 py-2 text-sm shadow-card sm:max-w-[70%]', m.is_mine ? 'bubble-mine bg-primary text-primary-fg' : 'bubble-theirs bg-surface text-ink border border-line')}>
                    {m.attachments.map((a) => (
                      <div key={a.file_id} className="mb-1">
                        {a.mime_type.startsWith('image/') ? (
                           
                          <a href={`/api/files/${a.file_id}`} target="_blank" rel="noreferrer"><img src={`/api/files/${a.file_id}`} alt={a.original_name} className="max-h-64 rounded-md object-cover" /></a>
                        ) : a.mime_type.startsWith('audio/') ? (
                          <audio controls src={`/api/files/${a.file_id}`} className="max-w-full" />
                        ) : (
                          <a href={`/api/files/${a.file_id}`} target="_blank" rel="noreferrer" className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs underline', m.is_mine ? 'bg-white/10' : 'bg-canvas')}>
                            <FileText className="size-3.5" /> {a.original_name}
                          </a>
                        )}
                      </div>
                    ))}
                    {m.body ? <p className="whitespace-pre-wrap break-words">{m.body}</p> : null}
                    <div className={cn('mt-1 flex items-center gap-1 text-[10px]', m.is_mine ? 'text-primary-fg/70' : 'text-muted')}>
                      {formatTime(m.created_at)}
                      {m.was_filtered ? <span title="تم إخفاء معلومات تواصل">• مُصفّاة</span> : null}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* composer */}
      {p.role !== 'admin' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) send(text.trim());
          }}
          className="flex items-end gap-2 border-t border-line bg-surface p-2 safe-bottom"
        >
          <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={(e) => onFiles(e.target.files)} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading || pending} className="rounded-md p-2 text-muted hover:bg-canvas-2 hover:text-primary disabled:opacity-50" aria-label="إرفاق ملف">
            <Paperclip className="size-5" />
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (text.trim()) send(text.trim());
              }
            }}
            rows={1}
            placeholder="اكتب رسالتك…"
            className="max-h-32 min-h-10 flex-1 resize-none rounded-full border border-line-2 bg-canvas px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
          {text.trim() ? (
            <Button type="submit" size="icon" className="rounded-full" loading={pending} aria-label="إرسال">
              <Send className="rtl:-scale-x-100" />
            </Button>
          ) : (
            <Button type="button" size="icon" variant={recording ? 'destructive' : 'soft'} className="rounded-full" onClick={toggleRecord} disabled={uploading} aria-label={recording ? 'إيقاف التسجيل' : 'تسجيل صوتي'}>
              {recording ? <Square /> : <Mic />}
            </Button>
          )}
        </form>
      ) : null}

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent title="الإبلاغ عن هذه المحادثة" description="سيراجع فريق المنصة البلاغ ويتخذ الإجراء المناسب.">
          <Textarea value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder="اذكر سبب البلاغ (مثال: محاولة مشاركة رقم، سلوك غير لائق، عرض غير جاد)" rows={3} />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setReportOpen(false)}>تراجع</Button>
            <Button
              variant="destructive"
              loading={pending}
              disabled={reportReason.trim().length < 3}
              onClick={() =>
                start(async () => {
                  const res = await reportAction({ reason: reportReason, reportedUserId: p.otherUserId, requestId: p.requestId, conversationId: p.conversationId });
                  if (!res.ok) { toast.error(res.error); return; }
                  toast.success('تم إرسال البلاغ');
                  setReportOpen(false);
                  setReportReason('');
                })
              }
            >
              إرسال البلاغ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
