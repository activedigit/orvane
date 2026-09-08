'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Pencil, Sparkles, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { analyzeRequestAction, categoryQuestionsAction, submitRequestAction, type AnalyzeResponse } from '@/actions/requests';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Alert } from '@/components/ui/misc';
import { FileUploader, type UploadedFile } from '@/components/upload/file-uploader';
import { RegisterForm } from '@/components/auth/register-form';
import type { Question } from '@/lib/requests/questionnaire';
import { cn } from '@/lib/utils';

type Analysis = AnalyzeResponse;
type Answers = Record<string, unknown>;

interface Draft { text: string; analysis: Analysis; questions: Question[]; answers: Answers; attachments: UploadedFile[]; step: number; done: boolean }
const DRAFT_KEY = 'orood:request-draft';

function answerLabel(q: Question, v: unknown): string {
  if (v == null || v === '') return 'تخطي';
  if (q.type === 'yesno') return v ? 'نعم' : 'لا';
  if (q.type === 'select') return q.options?.find((o) => o.value === v)?.label ?? String(v);
  if (q.type === 'multiselect') return (v as string[]).map((x) => q.options?.find((o) => o.value === x)?.label ?? x).join('، ');
  if (q.type === 'attachments') return Array.isArray(v) && v.length ? `${v.length} ملف` : 'بدون مرفقات';
  return String(v);
}

export function RequestWizard({ initialText, isAuthenticated, resume }: { initialText: string; isAuthenticated: boolean; resume: boolean }) {
  const router = useRouter();
  const [text, setText] = useState(initialText);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [step, setStep] = useState(0); // index into questions; questions.length => account/confirm
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // restore draft after login/registration
  useEffect(() => {
    if (!resume) return;
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as Draft;
      setText(d.text); setAnalysis(d.analysis); setQuestions(d.questions); setAnswers(d.answers); setAttachments(d.attachments); setStep(d.questions.length);
    } catch {}
  }, [resume]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [step, analysis]);

  const saveDraft = useCallback(() => {
    if (!analysis) return;
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ text, analysis, questions, answers, attachments, step, done: false } satisfies Draft));
  }, [text, analysis, questions, answers, attachments, step]);

  const analyze = async () => {
    setLoading(true);
    const res = await analyzeRequestAction(text);
    setLoading(false);
    if (!res.ok) { toast.error(res.error); return; }
    setAnalysis(res.data);
    setQuestions(res.data.questions);
    setAnswers({});
    setStep(0);
  };

  const current = questions[step];
  const categoryId = (answers.category as string) || analysis?.analysis.categoryId || null;
  const cityId = (answers.city as string) || analysis?.analysis.cityId || null;
  const subcategoryId = answers.subcategory !== undefined ? ((answers.subcategory as string) || null) : analysis?.analysis.subcategoryId ?? null;

  const answer = async (q: Question, value: unknown) => {
    const next = { ...answers, [q.id]: value };
    setAnswers(next);
    if (q.id === 'category' && value) {
      // swap the category-dependent questions
      setLoading(true);
      const res = await categoryQuestionsAction(String(value));
      setLoading(false);
      if (res.ok) {
        const rest = questions.slice(step + 1).filter((x) => x.id !== 'subcategory' && !x.id.startsWith('details.'));
        const subQ: Question[] = res.data.subcategories.length
          ? [{ id: 'subcategory', type: 'select', prompt: `تحديدًا، أي خدمة ضمن «${res.data.name}»؟`, options: [...res.data.subcategories.map((s) => ({ value: s.id, label: s.name_ar })), { value: '', label: 'غير متأكد / أخرى' }] }]
          : [];
        // details questions go before budget/timeline
        const idx = rest.findIndex((x) => x.id === 'city');
        const head = idx >= 0 ? rest.slice(0, idx + 1) : [];
        const tail = idx >= 0 ? rest.slice(idx + 1) : rest;
        const cleaned = Object.fromEntries(Object.entries(next).filter(([k]) => !k.startsWith('details.') && k !== 'subcategory'));
        setAnswers(cleaned);
        setQuestions([...questions.slice(0, step + 1), ...subQ, ...head, ...res.data.questions, ...tail]);
      }
    }
    setStep(step + 1);
  };

  const editStep = (i: number) => setStep(i);

  const submit = async () => {
    if (!analysis || !categoryId || !cityId) { toast.error('الفئة والمدينة مطلوبتان'); return; }
    setSubmitting(true);
    const details: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(answers)) if (k.startsWith('details.')) details[k.slice(8)] = v;
    const res = await submitRequestAction({
      description: text,
      categoryId,
      subcategoryId,
      cityId,
      budget: (answers.budget as string) || undefined,
      budgetMin: analysis.analysis.budgetMin,
      budgetMax: analysis.analysis.budgetMax,
      timeline: (answers.timeline as 'asap' | 'week' | 'month' | 'flexible') || null,
      urgent: analysis.analysis.urgency === 'urgent' || answers.urgent === true,
      details,
      attachmentFileIds: attachments.map((a) => a.id),
      aiMeta: { provider: analysis.analysis.provider, confidence: analysis.analysis.confidence },
    });
    setSubmitting(false);
    if (!res.ok) { toast.error(res.error); return; }
    sessionStorage.removeItem(DRAFT_KEY);
    setDone(res.data.requestId);
    setTimeout(() => router.push(`/dashboard/requests/${res.data.requestId}`), 1800);
  };

  const summary = useMemo(() => {
    if (!analysis) return [];
    const cat = analysis.categories.find((c) => c.id === categoryId);
    const sub = cat?.subcategories.find((s) => s.id === subcategoryId);
    const city = analysis.cities.find((c) => c.id === cityId);
    const items: { label: string; value: string }[] = [
      { label: 'الخدمة', value: cat ? `${cat.name_ar}${sub ? ` – ${sub.name_ar}` : ''}` : '—' },
      { label: 'المدينة', value: city?.name_ar ?? '—' },
    ];
    for (const q of questions) {
      if (['category', 'subcategory', 'city', 'attachments'].includes(q.id)) continue;
      if (q.id in answers) items.push({ label: q.prompt.replace(/[؟?]$/, ''), value: answerLabel(q, answers[q.id]) });
    }
    if (analysis.analysis.budgetMax != null && !('budget' in answers)) items.push({ label: 'الميزانية', value: `بحدود ${analysis.analysis.budgetMax.toLocaleString('en-US')} ر.س` });
    items.push({ label: 'المرفقات', value: attachments.length ? `${attachments.length} ملف` : 'بدون مرفقات' });
    return items;
  }, [analysis, answers, questions, categoryId, subcategoryId, cityId, attachments]);

  if (done) {
    return (
      <div className="fade-up rounded-xl border border-success/30 bg-surface p-8 text-center shadow-card">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-soft text-success">
          <Check className="size-7" />
        </span>
        <h2 className="mt-4 text-xl font-bold text-ink">تم تجهيز طلبك، سنرسله الآن للشركات المناسبة.</h2>
        <p className="mt-2 text-sm text-muted">ستصلك إشعارات عند وصول العروض. جارٍ تحويلك لصفحة الطلب…</p>
      </div>
    );
  }

  // Step 0: free text
  if (!analysis) {
    return (
      <div className="rounded-xl border border-line bg-surface p-5 shadow-card sm:p-6">
        <label className="mb-2 block text-base font-semibold text-ink">اكتب لنا الخدمة أو المشروع الذي تحتاجه...</label>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="مثال: أحتاج تصميم وتركيب لوحة خارجية لمحل في الرياض" className="text-base" autoFocus />
        <p className="mt-2 text-xs text-muted">اكتب بكلماتك، وسنسألك فقط عن التفاصيل الناقصة. لا تضع رقم جوالك أو بريدك في الوصف.</p>
        <div className="mt-4 flex justify-end">
          <Button size="lg" onClick={analyze} loading={loading} disabled={text.trim().length < 10}>
            متابعة <ArrowLeft />
          </Button>
        </div>
      </div>
    );
  }

  const understood = [analysis.categoryName && !('category' in answers) ? `الفئة: ${analysis.categoryName}` : null, analysis.subcategoryName && !('subcategory' in answers) ? analysis.subcategoryName : null, analysis.cityName && !('city' in answers) ? `المدينة: ${analysis.cityName}` : null, analysis.analysis.urgency === 'urgent' ? 'طلب عاجل' : null].filter(Boolean) as string[];

  return (
    <div className="space-y-3">
      {/* transcript */}
      <div className="rounded-xl border border-line bg-surface p-4 shadow-card sm:p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-ink-2">فهمنا طلبك:</p>
            <p className="mt-1 rounded-md bg-canvas p-3 text-sm text-ink">{text}</p>
            {understood.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {understood.map((u) => (
                  <span key={u} className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
                    {u}
                  </span>
                ))}
              </div>
            ) : null}
            <button type="button" onClick={() => { setAnalysis(null); setQuestions([]); setAnswers({}); }} className="mt-2 inline-flex items-center gap-1 text-xs text-muted hover:text-primary">
              <RotateCcw className="size-3" /> تعديل الوصف
            </button>
          </div>
        </div>

        <ol className="mt-4 space-y-3">
          {questions.slice(0, step).map((q, i) => (
            <li key={q.id} className="flex items-start justify-between gap-3 rounded-md border border-line px-3 py-2">
              <div className="min-w-0">
                <div className="text-xs text-muted">{q.prompt}</div>
                <div className="text-sm font-medium text-ink">{answerLabel(q, answers[q.id])}</div>
              </div>
              <button type="button" onClick={() => editStep(i)} className="shrink-0 rounded-md p-1 text-muted hover:bg-canvas-2 hover:text-primary" aria-label="تعديل">
                <Pencil className="size-4" />
              </button>
            </li>
          ))}
        </ol>
      </div>

      {/* current question */}
      {current ? (
        <div key={current.id} className="fade-up rounded-xl border border-primary/30 bg-surface p-4 shadow-card sm:p-5">
          <div className="mb-1 text-xs text-muted">
            سؤال {step + 1} من {questions.length}
          </div>
          <h3 className="text-base font-semibold text-ink">{current.prompt}</h3>
          {current.hint ? <p className="mt-1 text-xs text-muted">{current.hint}</p> : null}
          <div className="mt-4">
            <QuestionInput q={current} value={answers[current.id]} onAnswer={(v) => answer(current, v)} attachments={attachments} setAttachments={setAttachments} isAuthenticated={isAuthenticated} loading={loading} />
          </div>
          {current.optional ? (
            <div className="mt-3 text-end">
              <button type="button" onClick={() => answer(current, current.type === 'attachments' ? [] : '')} className="text-xs text-muted hover:text-primary">
                تخطي هذا السؤال
              </button>
            </div>
          ) : null}
        </div>
      ) : !isAuthenticated ? (
        <div className="fade-up rounded-xl border border-primary/30 bg-surface p-4 shadow-card sm:p-5">
          <h3 className="text-base font-semibold text-ink">خطوة أخيرة: أنشئ حسابك لاستقبال العروض</h3>
          <p className="mt-1 text-sm text-muted">بياناتك لا تظهر لأي مزود قبل أن تختاره بنفسك.</p>
          <div className="mt-4" onFocusCapture={saveDraft}>
            <RegisterForm next="/requests/new?resume=1" compact />
          </div>
          <p className="mt-3 text-center text-sm text-muted">
            لديك حساب؟{' '}
            <Link href="/login?next=%2Frequests%2Fnew%3Fresume%3D1" onClick={saveDraft} className="font-medium text-primary hover:underline">
              سجّل الدخول
            </Link>
          </p>
        </div>
      ) : (
        <div className="fade-up rounded-xl border border-primary/30 bg-surface p-4 shadow-card sm:p-5">
          <h3 className="text-base font-semibold text-ink">راجع طلبك قبل الإرسال</h3>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {summary.map((s) => (
              <div key={s.label} className="rounded-md bg-canvas px-3 py-2">
                <dt className="text-xs text-muted">{s.label}</dt>
                <dd className="text-sm font-medium text-ink">{s.value}</dd>
              </div>
            ))}
          </dl>
          {!categoryId || !cityId ? <Alert tone="warning" className="mt-3">الفئة والمدينة مطلوبتان لإرسال الطلب.</Alert> : null}
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button variant="ghost" onClick={() => setStep(Math.max(0, questions.length - 1))}>
              رجوع
            </Button>
            <Button size="lg" onClick={submit} loading={submitting} disabled={!categoryId || !cityId}>
              إرسال الطلب للمزودين المناسبين <ArrowLeft />
            </Button>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

function QuestionInput({ q, value, onAnswer, attachments, setAttachments, isAuthenticated, loading }: { q: Question; value: unknown; onAnswer: (v: unknown) => void; attachments: UploadedFile[]; setAttachments: (f: UploadedFile[]) => void; isAuthenticated: boolean; loading: boolean }) {
  const [local, setLocal] = useState<string>(typeof value === 'string' || typeof value === 'number' ? String(value) : '');
  const [multi, setMulti] = useState<string[]>(Array.isArray(value) ? (value as string[]) : []);

  if (q.type === 'select') {
    return (
      <div className={cn('grid gap-2', (q.options?.length ?? 0) > 6 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2')}>
        {q.options?.map((o) => (
          <button key={o.value || '__none'} type="button" disabled={loading} onClick={() => onAnswer(o.value)} className={cn('rounded-md border px-3 py-2.5 text-start text-sm transition-colors hover:border-primary hover:bg-primary-soft', value === o.value ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-surface text-ink')}>
            <div className="font-medium">{o.label}</div>
            {o.hint ? <div className="text-xs text-muted">{o.hint}</div> : null}
          </button>
        ))}
      </div>
    );
  }
  if (q.type === 'yesno') {
    return (
      <div className="grid grid-cols-2 gap-2">
        <Button variant={value === true ? 'default' : 'secondary'} onClick={() => onAnswer(true)}>نعم</Button>
        <Button variant={value === false ? 'default' : 'secondary'} onClick={() => onAnswer(false)}>لا</Button>
      </div>
    );
  }
  if (q.type === 'multiselect') {
    return (
      <div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {q.options?.map((o) => {
            const on = multi.includes(o.value);
            return (
              <button key={o.value} type="button" onClick={() => setMulti(on ? multi.filter((x) => x !== o.value) : [...multi, o.value])} className={cn('rounded-md border px-3 py-2 text-sm', on ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-surface text-ink')}>
                {o.label}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={() => onAnswer(multi)} disabled={!multi.length}>
            متابعة <ArrowLeft />
          </Button>
        </div>
      </div>
    );
  }
  if (q.type === 'attachments') {
    return (
      <div>
        {isAuthenticated ? <FileUploader scope="request" value={attachments} onChange={setAttachments} /> : <Alert tone="info">يمكنك رفع الصور والملفات بعد إنشاء الحساب، أو لاحقًا من صفحة الطلب.</Alert>}
        <div className="mt-3 flex justify-end">
          <Button onClick={() => onAnswer(attachments.map((a) => a.id))}>
            متابعة <ArrowLeft />
          </Button>
        </div>
      </div>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!local.trim() && !q.optional) return;
        onAnswer(q.type === 'number' ? Number(local) : local.trim());
      }}
      className="flex flex-col gap-2 sm:flex-row"
    >
      {q.type === 'number' ? (
        <Input type="number" inputMode="numeric" value={local} onChange={(e) => setLocal(e.target.value)} placeholder={q.placeholder} className="flex-1" autoFocus />
      ) : (
        <Input value={local} onChange={(e) => setLocal(e.target.value)} placeholder={q.placeholder} className="flex-1" autoFocus />
      )}
      <Button type="submit" disabled={!local.trim() && !q.optional}>
        متابعة <ArrowLeft />
      </Button>
    </form>
  );
}
