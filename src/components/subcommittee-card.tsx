
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Trash2, Edit, UserPlus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { DefenseSubCommittee, Supervisor } from '@/lib/types';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Badge } from './ui/badge';
import { EditSubCommitteeForm } from './edit-subcommittee-form';
import { ManageSubCommitteeMembersDialog } from './manage-subcommittee-members-dialog';


interface SubCommitteeCardProps {
  subcommittee: DefenseSubCommittee;
  allSupervisors: Supervisor[];
  sessionId: string;
}

const roleLabel: Record<string, string> = {
    Head: "Trưởng ban",
    Secretary: "Thư ký",
    Commissioner: "Ủy viên"
}


export function SubCommitteeCard({ subcommittee, allSupervisors, sessionId }: SubCommitteeCardProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const sortedMembers = useMemo(() => {
    const roleOrder: Record<string, number> = {
        'Head': 1,
        'Commissioner': 2,
        'Secretary': 3,
    };
    return [...subcommittee.members].sort((a, b) => (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99));
  }, [subcommittee.members]);


  const handleDelete = async () => {
    const subcommitteeDocRef = doc(firestore, `graduationDefenseSessions/${sessionId}/subCommittees`, subcommittee.id);
    
    deleteDoc(subcommitteeDocRef)
        .then(() => {
            toast({
                title: 'Thành công',
                description: `Đã xóa tiểu ban: ${subcommittee.name}`,
            });
            setIsDeleteDialogOpen(false);
        })
        .catch(error => {
            const contextualError = new FirestorePermissionError({
              path: subcommitteeDocRef.path,
              operation: 'delete',
            });
            errorEmitter.emit('permission-error', contextualError);
        });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>{subcommittee.name}</CardTitle>
            <CardDescription className="pt-1">
                {subcommittee.description || `${subcommittee.members.length} thành viên`}
            </CardDescription>
          </div>
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />
                <span>Sửa thông tin</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsMembersDialogOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                <span>Quản lý thành viên</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Xóa tiểu ban</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
            {sortedMembers.length > 0 ? (
                <ul className="space-y-2 text-sm">
                    {sortedMembers.map((member, index) => (
                        <li key={index} className="flex justify-between items-center">
                            <span>{member.name}</span>
                            <Badge variant="outline">{roleLabel[member.role] || member.role}</Badge>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-muted-foreground">Chưa có thành viên nào.</p>
            )}
        </CardContent>
      </Card>

    {/* Dialogs for actions */}
    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Sửa thông tin tiểu ban</DialogTitle>
            </DialogHeader>
            <EditSubCommitteeForm
                subcommittee={subcommittee}
                sessionId={sessionId}
                onFinished={() => setIsEditDialogOpen(false)}
            />
        </DialogContent>
    </Dialog>

    <Dialog open={isMembersDialogOpen} onOpenChange={setIsMembersDialogOpen}>
        <ManageSubCommitteeMembersDialog
            subcommittee={subcommittee}
            allSupervisors={allSupervisors}
            sessionId={sessionId}
            onFinished={() => setIsMembersDialogOpen(false)}
        />
    </Dialog>

    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn không?</AlertDialogTitle>
            <AlertDialogDescription>
                Hành động này không thể được hoàn tác. Thao tác này sẽ xóa vĩnh viễn tiểu ban và tất cả dữ liệu thành viên của nó.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Tiếp tục</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    </>
  );
}
