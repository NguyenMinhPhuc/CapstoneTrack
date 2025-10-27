

'use client';

import { useState } from 'react';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useFirestore } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import type { DefenseRegistration, DefenseSubCommittee } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';
import { Label } from './ui/label';
import { Info } from 'lucide-react';

interface AssignSubcommitteeManualDialogProps {
  registrationsToAssign: DefenseRegistration[];
  subCommittees: DefenseSubCommittee[];
  onFinished: () => void;
}

export function AssignSubcommitteeManualDialog({
  registrationsToAssign,
  subCommittees,
  onFinished,
}: AssignSubcommitteeManualDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedSubcommitteeId, setSelectedSubcommitteeId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedSubcommitteeId) {
      toast({
        variant: 'destructive',
        title: 'Chưa chọn tiểu ban',
        description: 'Vui lòng chọn một tiểu ban để phân công.',
      });
      return;
    }
    if (registrationsToAssign.length === 0) {
        toast({
            variant: 'destructive',
            title: 'Chưa chọn sinh viên',
            description: 'Vui lòng chọn ít nhất một sinh viên để phân công.',
        });
        return;
    }
    setIsSubmitting(true);

    const batch = writeBatch(firestore);
    
    registrationsToAssign.forEach(registration => {
      const registrationRef = doc(firestore, 'defenseRegistrations', registration.id);
      batch.update(registrationRef, { subCommitteeId: selectedSubcommitteeId });
    });

    try {
      await batch.commit();
      toast({
        title: 'Thành công',
        description: `Đã phân công ${registrationsToAssign.length} sinh viên vào tiểu ban.`,
      });
      onFinished();
    } catch (error: any) {
      console.error('Error manually assigning subcommittee:', error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: `Không thể phân công sinh viên: ${error.message}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Phân công Tiểu ban Thủ công</DialogTitle>
        <DialogDescription>
          Chọn một tiểu ban để phân công cho {registrationsToAssign.length} sinh viên đã chọn.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <Select onValueChange={setSelectedSubcommitteeId} disabled={subCommittees.length === 0}>
          <SelectTrigger>
            <SelectValue placeholder={subCommittees.length > 0 ? 'Chọn tiểu ban' : 'Chưa có tiểu ban nào'} />
          </SelectTrigger>
          <SelectContent>
            {subCommittees?.map(sc => (
              <SelectItem key={sc.id} value={sc.id}>
                {sc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {registrationsToAssign.length > 0 ? (
          <div>
            <Label>Sinh viên sẽ được phân công</Label>
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
        <Button onClick={handleSubmit} disabled={isSubmitting || registrationsToAssign.length === 0 || !selectedSubcommitteeId}>
          {isSubmitting ? 'Đang phân công...' : `Phân công ${registrationsToAssign.length} sinh viên`}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
