

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
import { useFirestore } from '@/firebase';
import { writeBatch, doc } from 'firebase/firestore';
import type { DefenseRegistration, Supervisor } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from './ui/scroll-area';
import { Label } from './ui/label';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Info } from 'lucide-react';
import { SupervisorCombobox } from './supervisor-combobox';


interface AssignInternshipSupervisorDialogProps {
  registrationsToAssign: DefenseRegistration[];
  onFinished: () => void;
}

export function AssignInternshipSupervisorDialog({
  registrationsToAssign,
  onFinished,
}: AssignInternshipSupervisorDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [supervisor, setSupervisor] = useState<Supervisor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (registrationsToAssign.length === 0) {
        toast({
            variant: 'destructive',
            title: 'Chưa chọn sinh viên',
            description: 'Vui lòng chọn ít nhất một sinh viên để gán GVHD.',
        });
        return;
    }
     if (!supervisor) {
      toast({
        variant: 'destructive',
        title: 'Chưa có tên người hướng dẫn',
        description: 'Vui lòng chọn hoặc nhập tên người hướng dẫn thực tập.',
      });
      return;
    }
    setIsSubmitting(true);

    const batch = writeBatch(firestore);
    
    const dataToUpdate = {
        internshipSupervisorId: supervisor.id,
        internshipSupervisorName: `${supervisor.firstName} ${supervisor.lastName}`,
    };
    
    registrationsToAssign.forEach(registration => {
      const registrationRef = doc(firestore, 'defenseRegistrations', registration.id);
      batch.update(registrationRef, dataToUpdate);
    });

    try {
      await batch.commit();
      toast({
        title: 'Thành công',
        description: `Đã gán GVHD Thực tập cho ${registrationsToAssign.length} sinh viên.`,
      });
      onFinished();
    } catch (error: any) {
      console.error('Error assigning internship supervisor:', error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: `Không thể gán GVHD Thực tập: ${error.message}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Gán Người Hướng dẫn Thực tập</DialogTitle>
        <DialogDescription>
          Chọn một giáo viên từ danh sách cho {registrationsToAssign.length} sinh viên đã chọn.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <SupervisorCombobox 
            value={supervisor?.id || null}
            onChange={(supervisorId) => {
                // This component manages the full supervisor object, so we don't need just the ID here.
            }}
            onSupervisorSelect={setSupervisor}
        />

        {registrationsToAssign.length > 0 ? (
          <div>
            <Label>Sinh viên sẽ được gán</Label>
            <ScrollArea className="h-40 mt-2 rounded-md border p-2">
              <ul className="space-y-1 text-sm">
                {registrationsToAssign.map(reg => (
                  <li key={reg.id}>{reg.studentName} ({reg.studentId})</li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        ) : (
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Không có sinh viên nào được chọn</AlertTitle>
                <AlertDescription>
                    Vui lòng quay lại và chọn ít nhất một sinh viên.
                </AlertDescription>
            </Alert>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onFinished} disabled={isSubmitting}>
          Hủy
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting || registrationsToAssign.length === 0}>
          {isSubmitting ? 'Đang gán...' : `Gán ${registrationsToAssign.length} sinh viên`}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
