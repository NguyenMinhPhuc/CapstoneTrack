

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
import { useFirestore } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import type { DefenseRegistration, DefenseSubCommittee } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { GitMerge, Users, ListTree, FolderGit2 } from 'lucide-react';
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

  const projectGroups = useMemo(() => {
    // Filter for unassigned students who are in 'reporting' status
    const unassigned = allRegistrations.filter(
      reg => !reg.subCommitteeId && reg.registrationStatus === 'reporting'
    );
    const groups = new Map<string, DefenseRegistration[]>();
    
    unassigned.forEach(reg => {
      // Treat registrations with empty project titles as individual projects.
      // Use registration ID to ensure uniqueness for each individual "project".
      const projectKey = reg.projectTitle || `_individual_${reg.id}`;
      
      if (!groups.has(projectKey)) {
        groups.set(projectKey, []);
      }
      groups.get(projectKey)!.push(reg);
    });

    return Array.from(groups.values());
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
    if (projectGroups.length === 0) {
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
    
    // Distribute project groups (not individual students) in a round-robin fashion
    projectGroups.forEach((projectGroup, index) => {
      const subCommitteeIndex = index % subCommittees.length;
      const subCommitteeId = subCommittees[subCommitteeIndex].id;
      
      // Assign all students in the project group to the same subcommittee
      projectGroup.forEach(registration => {
        const registrationRef = doc(firestore, 'defenseRegistrations', registration.id);
        batch.update(registrationRef, { subCommitteeId: subCommitteeId });
      });
    });

    try {
      await batch.commit();
       setProgress(100);
      toast({
        title: 'Thành công',
        description: `Đã phân công ${projectGroups.length} đề tài vào ${subCommittees.length} tiểu ban.`,
      });
      onFinished();
    } catch (error: any) {
      console.error('Error assigning subcommittees:', error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: `Không thể thực hiện phân công: ${error.message}`,
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
          Hệ thống sẽ tự động chia đều các đề tài chưa được phân công vào các tiểu ban hiện có. Các sinh viên cùng đề tài sẽ được xếp vào cùng một tiểu ban.
        </DialogDescription>
      </DialogHeader>

      <div className="py-4 space-y-4">
        {subCommittees.length > 0 ? (
            <div className="grid gap-4">
                <div className="flex items-center gap-4 p-4 rounded-lg border">
                    <FolderGit2 className="h-6 w-6 text-muted-foreground" />
                    <div>
                        <p className="font-semibold">{projectGroups.length}</p>
                        <p className="text-sm text-muted-foreground">Đề tài hợp lệ để phân công</p>
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
        <Button onClick={handleAssign} disabled={isAssigning || subCommittees.length === 0 || projectGroups.length === 0}>
          {isAssigning ? 'Đang phân công...' : 'Bắt đầu phân công'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
