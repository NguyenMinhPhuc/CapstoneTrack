
'use client';

import { useState } from 'react';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { ProjectTopic } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface RejectTopicDialogProps {
  topic: ProjectTopic;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function RejectTopicDialog({
  topic,
  onConfirm,
  onCancel,
}: RejectTopicDialogProps) {
  const [reason, setReason] = useState(topic.rejectionReason || '');
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Thiếu lý do',
        description: 'Vui lòng nhập lý do từ chối đề tài.',
      });
      return;
    }
    onConfirm(reason);
  };
  
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Từ chối Đề tài</DialogTitle>
        <DialogDescription>
          Cung cấp lý do từ chối cho đề tài <span className="font-bold">"{topic.title}"</span>. Lý do này sẽ được hiển thị cho giáo viên hướng dẫn.
        </DialogDescription>
      </DialogHeader>
      <div className="py-4 space-y-2">
        <Label htmlFor="rejection-reason">Lý do từ chối</Label>
        <Textarea
          id="rejection-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ví dụ: Tên đề tài không phù hợp, nội dung cần làm rõ hơn..."
          className="min-h-[120px]"
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Hủy
        </Button>
        <Button variant="destructive" onClick={handleSubmit}>
          Xác nhận Từ chối
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

    