
'use client';

import { useState } from 'react';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { DefenseRegistration, EarlyInternship } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface RejectionReasonDialogProps {
  registration: DefenseRegistration | EarlyInternship;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function RejectionReasonDialog({
  registration,
  onConfirm,
  onCancel,
}: RejectionReasonDialogProps) {
  const [reason, setReason] = useState('');
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Thiếu lý do',
        description: 'Vui lòng nhập lý do từ chối.',
      });
      return;
    }
    onConfirm(reason);
  };
  
  const studentName = (registration as DefenseRegistration).studentName || (registration as EarlyInternship).studentName;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Từ chối Đơn đăng ký</DialogTitle>
        <DialogDescription>
          Nhập lý do từ chối đơn đăng ký cho sinh viên <span className="font-bold">{studentName}</span>.
        </DialogDescription>
      </DialogHeader>
      <div className="py-4 space-y-2">
        <Label htmlFor="rejection-reason">Lý do từ chối</Label>
        <Textarea
          id="rejection-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ví dụ: Thông tin công ty không hợp lệ, thiếu minh chứng..."
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
    </>
  );
}
