'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FileUploader, type UploadedFile } from '@/components/upload/file-uploader';
import { Button } from '@/components/ui/button';
import { addRequestAttachmentsAction } from '@/actions/requests';

export function AttachmentsForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      <FileUploader scope="request" value={files} onChange={setFiles} />
      <Button
        disabled={!files.length}
        loading={pending}
        onClick={() =>
          start(async () => {
            const res = await addRequestAttachmentsAction(requestId, files.map((f) => f.id));
            if (!res.ok) { toast.error(res.error); return; }
            toast.success('تمت إضافة المرفقات');
            router.push(`/dashboard/requests/${requestId}`);
          })
        }
      >
        حفظ المرفقات
      </Button>
    </div>
  );
}
