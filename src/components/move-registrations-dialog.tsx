
'use client';

import { useState, useMemo } from 'react';
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
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import type { GraduationDefenseSession, DefenseRegistration } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from './ui/scroll-area';
import { Label } from './ui/label';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Info } from 'lucide-react';

interface MoveRegistrationsDialogProps {
  currentSessionId: string;
  registrationsToMove: DefenseRegistration[];
  onFinished: () => void;
}

export function MoveRegistrationsDialog({
  currentSessionId,
  registrationsToMove,
  onFinished,
}: MoveRegistrationsDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sessionsCollectionRef = useMemoFirebase(
    () => collection(firestore, 'graduationDefenseSessions'),
    [firestore]
  );
  const { data: allSessions, isLoading: isLoadingSessions } = useCollection<GraduationDefenseSession>(sessionsCollectionRef);

  const availableSessions = useMemo(() => {
      return allSessions?.filter(session => session.id !== currentSessionId);
  }, [allSessions, currentSessionId]);

  const handleSubmit = async () => {
    if (!selectedSessionId) {
      toast({
        variant: 'destructive',
        title: 'Chưa chọn đợt báo cáo',
        description: 'Vui lòng chọn một đợt báo cáo để chuyển sinh viên đến.',
      });
      return;
    }
    if (registrationsToMove.length === 0) {
        toast({
            variant: 'destructive',
            title: 'Chưa chọn sinh viên',
            description: 'Vui lòng chọn ít nhất một sinh viên để chuyển.',
        });
        return;
    }
    setIsSubmitting(true);

    const batch = writeBatch(firestore);
    
    registrationsToMove.forEach(registration => {
      const registrationRef = doc(firestore, 'defenseRegistrations', registration.id);
      batch.update(registrationRef, { sessionId: selectedSessionId });
    });

    try {
      await batch.commit();
      toast({
        title: 'Thành công',
        description: `Đã chuyển ${registrationsToMove.length} sinh viên sang đợt báo cáo mới.`,
      });
      onFinished();
    } catch (error: any) {
      console.error('Error moving registrations:', error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: `Không thể chuyển sinh viên: ${error.message}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Chuyển đợt báo cáo</DialogTitle>
        <DialogDescription>
          Chuyển {registrationsToMove.length} sinh viên đã chọn sang một đợt báo cáo khác.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <Select onValueChange={setSelectedSessionId} disabled={isLoadingSessions}>
          <SelectTrigger>
            <SelectValue placeholder={isLoadingSessions ? 'Đang tải...' : 'Chọn đợt báo cáo mới'} />
          </SelectTrigger>
          <SelectContent>
            {availableSessions?.map(session => (
              <SelectItem key={session.id} value={session.id}>
                {session.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {registrationsToMove.length > 0 ? (
          <div>
            <Label>Sinh viên sẽ được chuyển</Label>
            <ScrollArea className="h-40 mt-2 rounded-md border p-2">
              <ul className="space-y-1 text-sm">
                {registrationsToMove.map(reg => (
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
        <Button onClick={handleSubmit} disabled={isSubmitting || registrationsToMove.length === 0 || !selectedSessionId}>
          {isSubmitting ? 'Đang chuyển...' : `Chuyển ${registrationsToMove.length} sinh viên`}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
