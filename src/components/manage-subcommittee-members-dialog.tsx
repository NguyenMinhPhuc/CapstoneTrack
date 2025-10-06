
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { DefenseSubCommittee, Supervisor, SubCommitteeMember } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface ManageSubCommitteeMembersDialogProps {
  subcommittee: DefenseSubCommittee;
  allSupervisors: Supervisor[];
  sessionId: string;
  onFinished: () => void;
}

type NewMember = {
  supervisorId: string;
  role: 'Head' | 'Secretary' | 'Commissioner';
}

export function ManageSubCommitteeMembersDialog({
  subcommittee,
  allSupervisors,
  sessionId,
  onFinished,
}: ManageSubCommitteeMembersDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [members, setMembers] = useState<SubCommitteeMember[]>(subcommittee.members);
  const [newMember, setNewMember] = useState<Partial<NewMember>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableSupervisors = useMemo(() => {
    const memberIds = new Set(members.map(m => m.supervisorId));
    return allSupervisors.filter(s => !memberIds.has(s.id));
  }, [allSupervisors, members]);

  const handleAddMember = () => {
    if (!newMember.supervisorId || !newMember.role) {
      toast({ variant: 'destructive', title: 'Thiếu thông tin', description: 'Vui lòng chọn giáo viên và vai trò.' });
      return;
    }
    const supervisor = allSupervisors.find(s => s.id === newMember.supervisorId);
    if (!supervisor) return;

    const memberToAdd: SubCommitteeMember = {
      supervisorId: supervisor.id,
      name: `${supervisor.firstName} ${supervisor.lastName}`,
      role: newMember.role,
    };
    setMembers([...members, memberToAdd]);
    setNewMember({}); // Reset form
  };

  const handleRemoveMember = (supervisorId: string) => {
    setMembers(members.filter(m => m.supervisorId !== supervisorId));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const subcommitteeDocRef = doc(firestore, `graduationDefenseSessions/${sessionId}/subCommittees`, subcommittee.id);
    
    const updateData = { members: members };

    updateDoc(subcommitteeDocRef, updateData)
        .then(() => {
            toast({ title: 'Thành công', description: 'Đã cập nhật thành viên tiểu ban.' });
            onFinished();
        })
        .catch(error => {
            const contextualError = new FirestorePermissionError({
                path: subcommitteeDocRef.path,
                operation: 'update',
                requestResourceData: updateData
            });
            errorEmitter.emit('permission-error', contextualError);
        })
        .finally(() => {
            setIsSubmitting(false);
        });
  };

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Quản lý thành viên - {subcommittee.name}</DialogTitle>
        <DialogDescription>
          Thêm hoặc xóa thành viên khỏi tiểu ban này.
        </DialogDescription>
      </DialogHeader>

      <div className="py-4 space-y-4">
        <div className="space-y-2">
            <h3 className="text-sm font-medium">Thành viên hiện tại</h3>
            <ScrollArea className="h-40 rounded-md border">
                <div className="p-2 space-y-1">
                {members.length > 0 ? members.map(member => (
                    <div key={member.supervisorId} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                        <div>
                            <p className="font-semibold">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.role}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(member.supervisorId)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                )) : <p className="p-4 text-center text-sm text-muted-foreground">Chưa có thành viên.</p>}
                </div>
            </ScrollArea>
        </div>

        <div className="space-y-2">
            <h3 className="text-sm font-medium">Thêm thành viên mới</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Select
                    value={newMember.supervisorId || ''}
                    onValueChange={(value) => setNewMember(prev => ({...prev, supervisorId: value}))}
                >
                    <SelectTrigger className="sm:col-span-2">
                        <SelectValue placeholder="Chọn một giáo viên" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableSupervisors.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                                {`${s.firstName} ${s.lastName}`}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <Select
                    value={newMember.role || ''}
                    onValueChange={(value) => setNewMember(prev => ({...prev, role: value as any}))}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Chọn vai trò" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Head">Trưởng ban</SelectItem>
                        <SelectItem value="Secretary">Thư ký</SelectItem>
                        <SelectItem value="Commissioner">Ủy viên</SelectItem>
                    </SelectContent>
                </Select>
            </div>
             <Button onClick={handleAddMember} className="w-full sm:w-auto">Thêm vào tiểu ban</Button>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onFinished} disabled={isSubmitting}>
          Hủy
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

