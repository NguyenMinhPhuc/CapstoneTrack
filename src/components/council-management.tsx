
'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Trash2, Users } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import type { GraduationDefenseSession, DefenseCouncilMember, DefenseSubCommittee, Supervisor } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { AddCouncilMemberForm } from './add-council-member-form';
import { EditCouncilMemberForm } from './edit-council-member-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddSubCommitteeForm } from './add-subcommittee-form';
import { SubCommitteeCard } from './subcommittee-card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface CouncilManagementProps {
  session: GraduationDefenseSession;
  sessionId: string;
}

export function CouncilManagement({ session, sessionId }: CouncilManagementProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  // State for dialogs
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [isEditMemberDialogOpen, setIsEditMemberDialogOpen] = useState(false);
  const [isAddSubcommitteeDialogOpen, setIsAddSubcommitteeDialogOpen] = useState(false);

  // State for selected items
  const [selectedMember, setSelectedMember] = useState<DefenseCouncilMember | null>(null);

  // Firestore hooks
  const councilCollectionRef = useMemoFirebase(
    () => collection(firestore, `graduationDefenseSessions/${sessionId}/council`),
    [firestore, sessionId]
  );
  const { data: councilMembers, isLoading: isLoadingCouncil } = useCollection<DefenseCouncilMember>(councilCollectionRef);
  
  const sortedCouncilMembers = useMemo(() => {
    if (!councilMembers) return [];
    const roleOrder: Record<DefenseCouncilMember['role'], number> = {
        'President': 1,
        'Vice President': 2,
        'Member': 3,
        'Secretary': 4,
    };
    return [...councilMembers].sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);
  }, [councilMembers]);

  const subcommitteesCollectionRef = useMemoFirebase(
    () => collection(firestore, `graduationDefenseSessions/${sessionId}/subCommittees`),
    [firestore, sessionId]
  );
  const { data: subCommittees, isLoading: isLoadingSubcommittees } = useCollection<DefenseSubCommittee>(subcommitteesCollectionRef);

  const supervisorsCollectionRef = useMemoFirebase(() => collection(firestore, 'supervisors'), [firestore]);
  const { data: allSupervisors } = useCollection<Supervisor>(supervisorsCollectionRef);


  const handleEditClick = (member: DefenseCouncilMember) => {
    setSelectedMember(member);
    setIsEditMemberDialogOpen(true);
  };

  const handleDelete = async (memberId: string) => {
    const memberDocRef = doc(firestore, `graduationDefenseSessions/${sessionId}/council`, memberId);
    
    deleteDoc(memberDocRef)
        .then(() => {
            toast({
                title: 'Thành công',
                description: 'Đã xóa thành viên khỏi hội đồng.',
            });
        })
        .catch(error => {
            const contextualError = new FirestorePermissionError({
              path: memberDocRef.path,
              operation: 'delete',
            });
            errorEmitter.emit('permission-error', contextualError);
        });
  };
  
  const isLoading = isLoadingCouncil || isLoadingSubcommittees;


  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Quản lý Hội đồng - {session.name}</CardTitle>
          <CardDescription>
            Quản lý thành viên hội đồng chính và các tiểu ban báo cáo.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Tabs defaultValue="main_council" className="mt-6">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="main_council">Hội đồng chính</TabsTrigger>
            <TabsTrigger value="subcommittees">Các tiểu ban</TabsTrigger>
        </TabsList>
        
        <TabsContent value="main_council">
            <Card className="mt-4">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                             <CardTitle>Thành viên Hội đồng chính</CardTitle>
                             <CardDescription>Danh sách các giáo viên trong hội đồng của đợt báo cáo.</CardDescription>
                        </div>
                        <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Thêm thành viên
                                </Button>
                            </DialogTrigger>
                             <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Thêm thành viên mới</DialogTitle>
                                </DialogHeader>
                                <AddCouncilMemberForm 
                                    sessionId={sessionId} 
                                    allSupervisors={allSupervisors || []}
                                    existingMembers={councilMembers || []}
                                    onFinished={() => setIsAddMemberDialogOpen(false)} 
                                />
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                     {isLoadingCouncil ? (
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                        </div>
                     ) : (
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>STT</TableHead>
                                <TableHead>Tên</TableHead>
                                <TableHead>Vai trò</TableHead>
                                <TableHead className="text-right">Hành động</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {sortedCouncilMembers.map((member, index) => (
                                <TableRow key={member.id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell className="font-medium">{member.name}</TableCell>
                                <TableCell>{member.role}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                        <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleEditClick(member)}>Sửa vai trò</DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(member.id)}>Xóa</DropdownMenuItem>
                                    </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                     )}
                </CardContent>
            </Card>
        </TabsContent>
        
        <TabsContent value="subcommittees">
             <Card className="mt-4">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Các tiểu ban báo cáo</CardTitle>
                            <CardDescription>Tạo và quản lý thành viên cho từng tiểu ban.</CardDescription>
                        </div>
                         <Dialog open={isAddSubcommitteeDialogOpen} onOpenChange={setIsAddSubcommitteeDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Tạo tiểu ban mới
                                </Button>
                            </DialogTrigger>
                             <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Tạo tiểu ban mới</DialogTitle>
                                </DialogHeader>
                                <AddSubCommitteeForm 
                                    sessionId={sessionId}
                                    onFinished={() => setIsAddSubcommitteeDialogOpen(false)} 
                                />
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoadingSubcommittees ? (
                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <Skeleton className="h-48 w-full" />
                            <Skeleton className="h-48 w-full" />
                         </div>
                    ) : (
                        subCommittees && subCommittees.length > 0 ? (
                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {subCommittees.map(subcommittee => (
                                    <SubCommitteeCard 
                                        key={subcommittee.id}
                                        subcommittee={subcommittee}
                                        allSupervisors={allSupervisors || []}
                                        sessionId={sessionId}
                                    />
                                ))}
                            </div>
                        ) : (
                            <Alert>
                                <Users className="h-4 w-4" />
                                <AlertTitle>Chưa có tiểu ban</AlertTitle>
                                <AlertDescription>
                                    Hãy tạo tiểu ban đầu tiên để bắt đầu phân công giáo viên.
                                </AlertDescription>
                            </Alert>
                        )
                    )}
                </CardContent>
            </Card>
        </TabsContent>

      </Tabs>
      
      {/* Edit Member Dialog */}
      <Dialog open={isEditMemberDialogOpen} onOpenChange={setIsEditMemberDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sửa vai trò thành viên</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <EditCouncilMemberForm
              member={selectedMember}
              sessionId={sessionId}
              onFinished={() => setIsEditMemberDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

    </>
  );
}
