
'use client';

import { useState, useMemo } from 'react';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import type { DefenseRegistration, DefenseSubCommittee } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { GitMerge, Users, ListTree } from 'lucide-react';
import { Progress } from './ui/progress';

interface AssignSubcommitteeDialogProps {
  sessionId: string;
  allRegistrations: DefenseRegistration[];
  subCommittees: DefenseSubCommittee[];
  onFinished: () => void;
}

export function AssignSubcommitteeDialog({
  sessionId,
  allRegistrations,
  subCommittees,
  onFinished,
}: AssignSubcommitteeDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAssigning, setIsAssigning] = useState(false);
  const [progress, setProgress] = useState(0);

  const unassignedRegistrations = useMemo(() => {
    return allRegistrations.filter(reg => !reg.subCommitteeId && reg.registrationStatus === 'reporting');
  }, [allRegistrations]);

  const handleAssign = async () => {
    if (subCommittees.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Chưa có tiểu ban',
        description: 'Vui lòng tạo tiểu ban trước khi phân công.',
      });
      return;
    }
    if (unassignedRegistrations.length === 0) {
        toast({
            variant: 'destructive',
            title: 'Không có sinh viên nào',
            description: 'Tất cả sinh viên đã được phân công hoặc không ở trạng thái "Báo cáo".',
        });
        return;
    }
    setIsAssigning(true);
    setProgress(0);

    const batch = writeBatch(firestore);
    
    // Simple round-robin assignment
    unassignedRegistrations.forEach((registration, index) => {
      const subCommitteeIndex = index % subCommittees.length;
      const subCommitteeId = subCommittees[subCommitteeIndex].id;
      
      const registrationRef = doc(firestore, 'defenseRegistrations', registration.id);
      batch.update(registrationRef, { subCommitteeId: subCommitteeId });
    });

    try {
      await batch.commit();
       setProgress(100);
      toast({
        title: 'Thành công',
        description: `Đã phân công ${unassignedRegistrations.length} sinh viên vào ${subCommittees.length} tiểu ban.`,
      });
      onFinished();
    } catch (error) {
      console.error('Error assigning subcommittees:', error);
       const contextualError = new FirestorePermissionError({
          path: 'batch update on defenseRegistrations',
          operation: 'update',
          requestResourceData: { subCommitteeId: '...multiple...' },
        });
        errorEmitter.emit('permission-error', contextualError);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể thực hiện phân công.',
      });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Phân công Tiểu ban Tự động</DialogTitle>
        <DialogDescription>
          Hệ thống sẽ tự động chia đều các sinh viên chưa được phân công vào các tiểu ban hiện có.
        </DialogDescription>
      </DialogHeader>

      <div className="py-4 space-y-4">
        {subCommittees.length > 0 ? (
            <div className="grid gap-4">
                <div className="flex items-center gap-4 p-4 rounded-lg border">
                    <Users className="h-6 w-6 text-muted-foreground" />
                    <div>
                        <p className="font-semibold">{unassignedRegistrations.length}</p>
                        <p className="text-sm text-muted-foreground">Sinh viên chưa phân công</p>
                    </div>
                </div>
                 <div className="flex items-center gap-4 p-4 rounded-lg border">
                    <ListTree className="h-6 w-6 text-muted-foreground" />
                    <div>
                        <p className="font-semibold">{subCommittees.length}</p>
                        <p className="text-sm text-muted-foreground">Tiểu ban hiện có</p>
                    </div>
                </div>
            </div>
        ) : (
            <Alert>
                <GitMerge className="h-4 w-4" />
                <AlertTitle>Chưa có tiểu ban nào</AlertTitle>
                <AlertDescription>
                    Bạn cần vào mục Quản lý Hội đồng để tạo các tiểu ban trước khi có thể phân công.
                </AlertDescription>
            </Alert>
        )}
        {isAssigning && <Progress value={progress} className="w-full" />}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onFinished} disabled={isAssigning}>
          Đóng
        </Button>
        <Button onClick={handleAssign} disabled={isAssigning || subCommittees.length === 0 || unassignedRegistrations.length === 0}>
          {isAssigning ? 'Đang phân công...' : 'Bắt đầu phân công'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

    