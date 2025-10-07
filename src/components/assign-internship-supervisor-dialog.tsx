
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
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import type { DefenseRegistration, Supervisor } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from './ui/scroll-area';
import { Label } from './ui/label';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Info } from 'lucide-react';
import { SupervisorSelect } from './supervisor-select';

const NO_SUPERVISOR_VALUE = "__NONE__";

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
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>('');
  const [selectedSupervisor, setSelectedSupervisor] = useState<Supervisor | null>(null);
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
    setIsSubmitting(true);

    const batch = writeBatch(firestore);
    
    const supervisorIdValue = selectedSupervisorId === NO_SUPERVISOR_VALUE ? '' : (selectedSupervisorId || '');
    const supervisorNameValue = selectedSupervisor ? `${selectedSupervisor.firstName} ${selectedSupervisor.lastName}` : '';

    const dataToUpdate = {
        internshipSupervisorId: supervisorIdValue,
        internshipSupervisorName: supervisorNameValue,
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
       const contextualError = new FirestorePermissionError({
          path: 'batch update on defenseRegistrations',
          operation: 'update',
          requestResourceData: dataToUpdate,
        });
        errorEmitter.emit('permission-error', contextualError);
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
        <DialogTitle>Gán Giáo viên Hướng dẫn Thực tập</DialogTitle>
        <DialogDescription>
          Chọn một giáo viên để hướng dẫn thực tập cho {registrationsToAssign.length} sinh viên đã chọn.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <SupervisorSelect 
            value={selectedSupervisorId}
            onChange={setSelectedSupervisorId}
            onSupervisorSelect={setSelectedSupervisor}
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
