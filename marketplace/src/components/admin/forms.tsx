import { SubmitButton } from '@/components/ui/submit-button';
import { Input, Select, Textarea, Field } from '@/components/ui/input';
import type { ButtonProps } from '@/components/ui/button';

/** Tiny inline form for row actions in server components (hidden fields + one button). */
export function ActionForm({ action, fields, label, variant = 'secondary', size = 'sm', confirm }: { action: (fd: FormData) => Promise<void>; fields: Record<string, string>; label: string; variant?: ButtonProps['variant']; size?: ButtonProps['size']; confirm?: string }) {
  return (
    <form action={action} className="inline" {...(confirm ? { onSubmit: undefined } : {})}>
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <SubmitButton variant={variant} size={size}>{label}</SubmitButton>
    </form>
  );
}

export { Input, Select, Textarea, Field, SubmitButton };
