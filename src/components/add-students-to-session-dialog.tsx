
'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, writeBatch, serverTimestamp, doc } from 'firebase/firestore';
import type { Student, GraduationDefenseSession } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Info } from 'lucide-react';

interface AddStudentsToSessionDialogProps {
  studentIds: string[];
  allStudents: Student[];
  onFinished: () => void;
}

export function AddStudentsToSessionDialog({
  studentIds,
  allStudents,
  onFinished,
}: AddStudentsToSessionDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sessionsCollectionRef = useMemoFirebase(
    () => collection(firestore, 'graduationDefenseSessions'),
    [firestore]
  );
  const { data: sessions, isLoading: isLoadingSessions } = useCollection<GraduationDefenseSession>(sessionsCollectionRef);

  const studentsToAdd = useMemo(() => {
    return allStudents.filter(student => studentIds.includes(student.id));
  }, [studentIds, allStudents]);

  const handleSubmit = async () => {
    if (!selectedSession) {
      toast({
        variant: 'destructive',
        title: 'Chưa chọn đợt báo cáo',
        description: 'Vui lòng chọn một đợt báo cáo để thêm sinh viên.',
      });
      return;
    }
    setIsSubmitting(true);

    const batch = writeBatch(firestore);
    const registrationsCollectionRef = collection(firestore, 'defenseRegistrations');
    
    studentsToAdd.forEach(student => {
      const newRegistrationRef = doc(registrationsCollectionRef);
      batch.set(newRegistrationRef, {
        sessionId: selectedSession,
        studentDocId: student.id,
        studentId: student.studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        registrationDate: serverTimestamp(),
        graduationStatus: 'not_reporting',
        internshipStatus: 'not_reporting',
      });
    });

    try {
      await batch.commit();
      toast({
        title: 'Thành công',
        description: `Đã thêm ${studentsToAdd.length} sinh viên vào đợt báo cáo.`,
      });
      onFinished();
    } catch (error: any) {
      console.error('Error adding students to session:', error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: `Không thể thêm sinh viên: ${error.message}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Thêm sinh viên vào đợt báo cáo</DialogTitle>
        <DialogDescription>
          Chọn một đợt báo cáo để thêm {studentsToAdd.length} sinh viên đã chọn.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <Select onValueChange={setSelectedSession} disabled={isLoadingSessions}>
          <SelectTrigger>
            <SelectValue placeholder={isLoadingSessions ? 'Đang tải...' : 'Chọn đợt báo cáo'} />
          </SelectTrigger>
          <SelectContent>
            {sessions?.map(session => (
              <SelectItem key={session.id} value={session.id}>
                {session.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {studentsToAdd.length > 0 ? (
          <div>
            <Label>Sinh viên sẽ được thêm</Label>
            <ScrollArea className="h-40 mt-2 rounded-md border p-2">
              <ul className="space-y-1 text-sm">
                {studentsToAdd.map(student => (
                  <li key={student.id}>{student.firstName} {student.lastName} ({student.studentId})</li>
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
        <Button onClick={handleSubmit} disabled={isSubmitting || studentsToAdd.length === 0 || !selectedSession}>
          {isSubmitting ? 'Đang thêm...' : `Thêm ${studentsToAdd.length} sinh viên`}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
