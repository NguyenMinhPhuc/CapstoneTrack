
'use client';

import { useState, useMemo, useEffect } from 'react';
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
  CardHeader,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Search, ListFilter, Users, Move, Edit, Star, XCircle, RefreshCw, GitMerge, UserCheck, Briefcase, GraduationCap } from 'lucide-react';
import { useFirestore, errorEmitter, FirestorePermissionError, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, writeBatch, updateDoc } from 'firebase/firestore';
import type { DefenseRegistration, StudentWithRegistrationDetails, Student, DefenseSubCommittee } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { AddStudentRegistrationForm } from './add-student-registration-form';
import { EditStudentRegistrationForm } from './edit-student-registration-form';
import { Input } from './ui/input';
import { AddStudentsByClassDialog } from './add-students-by-class-dialog';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { Checkbox } from './ui/checkbox';
import { MoveRegistrationsDialog } from './move-registrations-dialog';
import { EditGroupRegistrationForm } from './edit-group-registration-form';
import { SpecialExemptionForm } from './special-exemption-form';
import { WithdrawRegistrationForm } from './withdraw-registration-form';
import { AssignSubcommitteeDialog } from './assign-subcommittee-dialog';
import { AssignSubcommitteeManualDialog } from './assign-subcommittee-manual-dialog';
import { AssignInternshipSupervisorDialog } from './assign-internship-supervisor-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';


interface StudentRegistrationTableProps {
  sessionId: string;
  initialData: StudentWithRegistrationDetails[] | null;
  isLoading: boolean;
}

type ReportStatusType = 'graduationStatus' | 'internshipStatus';

const registrationStatusLabel: Record<DefenseRegistration['graduationStatus'], string> = {
    reporting: 'Báo cáo',
    exempted: 'Đặc cách',
    withdrawn: 'Bỏ báo cáo',
    not_reporting: 'Không BC',
};

const registrationStatusVariant: Record<DefenseRegistration['graduationStatus'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
    reporting: 'default',
    exempted: 'secondary',
    withdrawn: 'destructive',
    not_reporting: 'outline',
};


const UNASSIGNED_VALUE = "__UNASSIGNED__";


export function StudentRegistrationTable({ sessionId, initialData, isLoading }: StudentRegistrationTableProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddByClassDialogOpen, setIsAddByClassDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isEditGroupDialogOpen, setIsEditGroupDialogOpen] = useState(false);
  const [isExemptionDialogOpen, setIsExemptionDialogOpen] = useState(false);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [isAssignSubcommitteeDialogOpen, setIsAssignSubcommitteeDialogOpen] = useState(false);
  const [isAssignManualDialogOpen, setIsAssignManualDialogOpen] = useState(false);
  const [isAssignInternshipSupervisorDialogOpen, setIsAssignInternshipSupervisorDialogOpen] = useState(false);


  const [selectedRegistration, setSelectedRegistration] = useState<DefenseRegistration | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [supervisorFilter, setSupervisorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  
  useEffect(() => {
    setSelectedRowIds([]);
  }, [initialData]);

  const subcommitteesCollectionRef = useMemoFirebase(
    () => collection(firestore, `graduationDefenseSessions/${sessionId}/subCommittees`),
    [firestore, sessionId]
  );
  const { data: subCommittees } = useCollection<DefenseSubCommittee>(subcommitteesCollectionRef);

  const subCommitteeMap = useMemo(() => {
    if (!subCommittees) return new Map();
    return new Map(subCommittees.map(sc => [sc.id, sc.name]));
  }, [subCommittees]);

  const uniqueSupervisors = useMemo(() => {
    if (!initialData) return [];
    const supervisorSet = new Set<string>();
    initialData.forEach(reg => {
      if (reg.supervisorName) {
        supervisorSet.add(reg.supervisorName);
      }
    });
    return Array.from(supervisorSet).sort();
  }, [initialData]);

  const filteredRegistrations = useMemo(() => {
    if (!initialData) return [];
    return initialData.filter(reg => {
      const term = searchTerm.toLowerCase();
      const nameMatch = reg.studentName.toLowerCase().includes(term);
      const idMatch = reg.studentId.toLowerCase().includes(term);
      const searchMatch = nameMatch || idMatch;

      const supervisorMatch = supervisorFilter === 'all' || reg.supervisorName === supervisorFilter;
      const statusMatch = statusFilter === 'all' || reg.graduationStatus === statusFilter || reg.internshipStatus === statusFilter;

      return searchMatch && supervisorMatch && statusMatch;
    });
  }, [initialData, searchTerm, supervisorFilter, statusFilter]);

  const handleSubcommitteeChange = async (registrationId: string, newSubCommitteeId: string) => {
      const registrationDocRef = doc(firestore, 'defenseRegistrations', registrationId);
      const subCommitteeIdToUpdate = newSubCommitteeId === UNASSIGNED_VALUE ? "" : newSubCommitteeId;
      
      const updateData = { subCommitteeId: subCommitteeIdToUpdate };

      updateDoc(registrationDocRef, updateData)
        .then(() => {
            toast({
                title: 'Thành công',
                description: 'Đã cập nhật tiểu ban cho sinh viên.',
            });
        })
        .catch(error => {
            const contextualError = new FirestorePermissionError({
              path: registrationDocRef.path,
              operation: 'update',
              requestResourceData: updateData,
            });
            errorEmitter.emit('permission-error', contextualError);
        });
  };

  const handleEditClick = (registration: DefenseRegistration) => {
    setSelectedRegistration(registration);
    setIsEditDialogOpen(true);
  };

  const handleRevertToReporting = async (registrationIds: string[], type: 'graduation' | 'internship' | 'both') => {
    if (registrationIds.length === 0) {
      toast({
        variant: "destructive",
        title: "Chưa chọn sinh viên",
        description: "Vui lòng chọn ít nhất một sinh viên để thực hiện.",
      });
      return;
    }

    const batch = writeBatch(firestore);
    
    let dataToUpdate: any = {};
    if (type === 'graduation' || type === 'both') {
        dataToUpdate = {
            ...dataToUpdate,
            graduationStatus: 'reporting',
            graduationStatusNote: "",
            graduationExemptionDecisionNumber: "",
            graduationExemptionDecisionDate: null,
            graduationExemptionProofLink: "",
        }
    }
    if (type === 'internship' || type === 'both') {
         dataToUpdate = {
            ...dataToUpdate,
            internshipStatus: 'reporting',
            internshipStatusNote: "",
            internshipExemptionDecisionNumber: "",
            internshipExemptionDecisionDate: null,
            internshipExemptionProofLink: "",
        }
    }


    registrationIds.forEach(id => {
      const registrationDocRef = doc(firestore, 'defenseRegistrations', id);
      batch.update(registrationDocRef, dataToUpdate);
    });

    try {
        await batch.commit();
        toast({
            title: 'Thành công',
            description: `Đã cập nhật trạng thái cho ${registrationIds.length} sinh viên.`,
        });
        setSelectedRowIds([]); // Clear selection after action
    } catch(error) {
        console.error('Error reverting registration status:', error);
        const contextualError = new FirestorePermissionError({
          path: 'batch update on defenseRegistrations',
          operation: 'update',
          requestResourceData: dataToUpdate,
        });
        errorEmitter.emit('permission-error', contextualError);
        toast({
            variant: 'destructive',
            title: 'Lỗi',
            description: `Không thể cập nhật trạng thái sinh viên.`
        })
    }
  };

  const handleDelete = async (registrationId: string) => {
    const registrationDocRef = doc(firestore, 'defenseRegistrations', registrationId);
    
    deleteDoc(registrationDocRef)
        .then(() => {
            toast({
                title: 'Thành công',
                description: 'Đã xóa sinh viên khỏi đợt báo cáo.',
            });
        })
        .catch(error => {
            const contextualError = new FirestorePermissionError({
                path: registrationDocRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', contextualError);
        });
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
        setSelectedRowIds(filteredRegistrations?.map(s => s.id) || []);
    } else {
        setSelectedRowIds([]);
    }
  };

  const handleRowSelect = (id: string, checked: boolean) => {
    if (checked) {
        setSelectedRowIds(prev => [...prev, id]);
    } else {
        setSelectedRowIds(prev => prev.filter(rowId => rowId !== id));
    }
  };

  const handleGroupActionFinished = () => {
    setIsMoveDialogOpen(false);
    setIsEditGroupDialogOpen(false);
    setIsExemptionDialogOpen(false);
    setIsWithdrawDialogOpen(false);
    setIsAssignManualDialogOpen(false);
    setIsAssignInternshipSupervisorDialogOpen(false);
    setSelectedRowIds([]);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/4" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const isAllSelected = filteredRegistrations && selectedRowIds.length > 0 && selectedRowIds.length === filteredRegistrations.length;
  const isSomeSelected = selectedRowIds.length > 0 && (!filteredRegistrations || selectedRowIds.length < filteredRegistrations.length);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
           <div className="flex flex-wrap items-center gap-2">
                 {selectedRowIds.length > 0 && (
                    <>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    <span>Về 'Báo cáo' ({selectedRowIds.length})</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleRevertToReporting(selectedRowIds, 'graduation')}>Chỉ Tốt nghiệp</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleRevertToReporting(selectedRowIds, 'internship')}>Chỉ Thực tập</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleRevertToReporting(selectedRowIds, 'both')}>Cả hai</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Dialog open={isExemptionDialogOpen} onOpenChange={setIsExemptionDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Star className="mr-2 h-4 w-4" />
                                    Xét đặc cách ({selectedRowIds.length})
                                </Button>
                            </DialogTrigger>
                             <SpecialExemptionForm
                                registrations={initialData?.filter(reg => selectedRowIds.includes(reg.id)) || []}
                                onFinished={handleGroupActionFinished}
                            />
                        </Dialog>
                        <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Bỏ báo cáo ({selectedRowIds.length})
                                </Button>
                            </DialogTrigger>
                             <WithdrawRegistrationForm
                                registrations={initialData?.filter(reg => selectedRowIds.includes(reg.id)) || []}
                                onFinished={handleGroupActionFinished}
                            />
                        </Dialog>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Users className="mr-2 h-4 w-4" />
                                    <span>Thao tác nhóm ({selectedRowIds.length})</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => setIsEditGroupDialogOpen(true)} disabled={selectedRowIds.length > 2}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Cập nhật đề tài
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setIsAssignInternshipSupervisorDialogOpen(true)}>
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Gán GVHD Thực tập
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setIsAssignManualDialogOpen(true)}>
                                    <GitMerge className="mr-2 h-4 w-4" />
                                    Phân công Tiểu ban
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setIsMoveDialogOpen(true)}>
                                    <Move className="mr-2 h-4 w-4" />
                                    Chuyển sang đợt khác
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </>
                )}
            </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <div className="flex w-full sm:w-auto gap-2">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                      type="search"
                      placeholder="Tìm theo tên hoặc MSSV..."
                      className="pl-8 w-full sm:w-48"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 gap-1 text-sm">
                            <ListFilter className="h-3.5 w-3.5" />
                            <span className="sr-only sm:not-sr-only">Lọc</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Lọc theo GVHD</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                            checked={supervisorFilter === 'all'}
                            onCheckedChange={() => setSupervisorFilter('all')}
                        >
                            Tất cả GVHD
                        </DropdownMenuCheckboxItem>
                        {uniqueSupervisors.map(supervisor => (
                            <DropdownMenuCheckboxItem
                                key={supervisor}
                                checked={supervisorFilter === supervisor}
                                onCheckedChange={() => setSupervisorFilter(supervisor)}
                            >
                                {supervisor}
                            </DropdownMenuCheckboxItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Lọc theo trạng thái</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                            checked={statusFilter === 'all'}
                            onCheckedChange={() => setStatusFilter('all')}
                        >
                            Tất cả
                        </DropdownMenuCheckboxItem>
                        {Object.entries(registrationStatusLabel).map(([key, label]) => (
                             <DropdownMenuCheckboxItem
                                key={key}
                                checked={statusFilter === key}
                                onCheckedChange={() => setStatusFilter(key)}
                            >
                                {label}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex w-full sm:w-auto gap-2">
                  <Dialog open={isAssignSubcommitteeDialogOpen} onOpenChange={setIsAssignSubcommitteeDialogOpen}>
                      <DialogTrigger asChild>
                          <Button variant="outline" className="w-full">
                              <GitMerge className="mr-2 h-4 w-4" />
                              Phân công tự động
                          </Button>
                      </DialogTrigger>
                      <AssignSubcommitteeDialog
                          sessionId={sessionId}
                          allRegistrations={initialData || []}
                          subCommittees={subCommittees || []}
                          onFinished={() => setIsAssignSubcommitteeDialogOpen(false)}
                      />
                  </Dialog>
                <Dialog open={isAddByClassDialogOpen} onOpenChange={setIsAddByClassDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                            <Users className="mr-2 h-4 w-4" />
                            Thêm theo lớp
                        </Button>
                    </DialogTrigger>
                    <AddStudentsByClassDialog sessionId={sessionId} existingRegistrations={initialData || []} onFinished={() => setIsAddByClassDialogOpen(false)} />
                </Dialog>
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                      <Button className="w-full">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Thêm Sinh viên
                      </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                      <DialogTitle>Thêm sinh viên vào đợt</DialogTitle>
                      <DialogDescription>
                          Chọn sinh viên và điền thông tin đề tài (nếu có).
                      </DialogDescription>
                      </DialogHeader>
                      <AddStudentRegistrationForm
                      sessionId={sessionId}
                      onFinished={() => setIsAddDialogOpen(false)}
                      />
                  </DialogContent>
                  </Dialog>
              </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                 <TableHead className="w-[50px]">
                    <Checkbox
                        checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                        onCheckedChange={handleSelectAll}
                    />
                </TableHead>
                <TableHead>STT</TableHead>
                <TableHead>Tên sinh viên</TableHead>
                <TableHead>Tên đề tài</TableHead>
                <TableHead>GVHD TN</TableHead>
                <TableHead>GVHD TT</TableHead>
                <TableHead>Tiểu ban</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRegistrations && filteredRegistrations.length > 0 ? (
                filteredRegistrations.map((reg, index) => (
                  <TableRow key={reg.id} data-state={selectedRowIds.includes(reg.id) && "selected"}>
                    <TableCell>
                        <Checkbox
                            checked={selectedRowIds.includes(reg.id)}
                            onCheckedChange={(checked) => handleRowSelect(reg.id, !!checked)}
                        />
                    </TableCell>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">
                        <div>{reg.studentName}</div>
                        <div className="text-xs text-muted-foreground">{reg.studentId}</div>
                    </TableCell>
                    <TableCell>
                      {reg.projectTitle ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="line-clamp-2 max-w-xs cursor-default">
                                {reg.projectTitle}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-md">{reg.projectTitle}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        'Chưa có'
                      )}
                    </TableCell>
                    <TableCell>{reg.supervisorName || 'Chưa có'}</TableCell>
                    <TableCell>{reg.internshipSupervisorName || 'Chưa có'}</TableCell>
                    <TableCell>
                        <Select
                            value={reg.subCommitteeId || UNASSIGNED_VALUE}
                            onValueChange={(newId) => handleSubcommitteeChange(reg.id, newId)}
                            disabled={!subCommittees || subCommittees.length === 0}
                        >
                            <SelectTrigger className="w-40 text-xs h-8">
                                <SelectValue placeholder="Chọn tiểu ban" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={UNASSIGNED_VALUE}>Chưa phân công</SelectItem>
                                {subCommittees?.map(sc => (
                                    <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col gap-1">
                          <Badge variant={registrationStatusVariant[reg.graduationStatus]} className="justify-center">
                            <GraduationCap className="mr-1 h-3 w-3"/>
                            {registrationStatusLabel[reg.graduationStatus]}
                          </Badge>
                          <Badge variant={registrationStatusVariant[reg.internshipStatus]} className="justify-center">
                            <Briefcase className="mr-1 h-3 w-3"/>
                            {registrationStatusLabel[reg.internshipStatus]}
                          </Badge>
                       </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem onClick={() => handleEditClick(reg)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Sửa đề tài/GVHD</span>
                            </DropdownMenuItem>
                          <DropdownMenuSeparator />
                           <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    <span>Về 'Báo cáo'</span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onClick={() => handleRevertToReporting([reg.id], 'graduation')} disabled={reg.graduationStatus === 'reporting'}>Chỉ Tốt nghiệp</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleRevertToReporting([reg.id], 'internship')} disabled={reg.internshipStatus === 'reporting'}>Chỉ Thực tập</DropdownMenuItem>
                                </DropdownMenuSubContent>
                           </DropdownMenuSub>
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                     <Star className="mr-2 h-4 w-4" />
                                    <span>Xét đặc cách</span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onClick={() => { setIsExemptionDialogOpen(true); setSelectedRowIds([reg.id]); }}>Cho Tốt nghiệp</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { /* Implement internship exemption */ }}>Cho Thực tập</DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                     <XCircle className="mr-2 h-4 w-4" />
                                    <span>Bỏ báo cáo</span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onClick={() => { setIsWithdrawDialogOpen(true); setSelectedRowIds([reg.id]); }}>Tốt nghiệp</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setIsWithdrawDialogOpen(true); setSelectedRowIds([reg.id]); }}>Thực tập</DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(reg.id)}>
                            Xóa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="text-center">
                    Chưa có sinh viên nào được thêm vào đợt này.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog for single edit */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
            <DialogTitle>Sửa thông tin đăng ký</DialogTitle>
            <DialogDescription>
                Cập nhật tên đề tài hoặc giáo viên hướng dẫn cho sinh viên.
            </DialogDescription>
            </DialogHeader>
            {selectedRegistration && (
                <EditStudentRegistrationForm
                    registration={selectedRegistration}
                    onFinished={() => setIsEditDialogOpen(false)}
                />
            )}
        </DialogContent>
      </Dialog>
      
       {/* Dialog for group edit */}
       <Dialog open={isEditGroupDialogOpen} onOpenChange={setIsEditGroupDialogOpen}>
            <EditGroupRegistrationForm
                registrations={initialData?.filter(reg => selectedRowIds.includes(reg.id)) || []}
                onFinished={handleGroupActionFinished}
            />
       </Dialog>

        {/* Other Group Action Dialogs */}
        <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
            <MoveRegistrationsDialog
                currentSessionId={sessionId}
                registrationsToMove={initialData?.filter(reg => selectedRowIds.includes(reg.id)) || []}
                onFinished={handleGroupActionFinished}
            />
        </Dialog>

        <Dialog open={isAssignInternshipSupervisorDialogOpen} onOpenChange={setIsAssignInternshipSupervisorDialogOpen}>
            <AssignInternshipSupervisorDialog
                registrationsToAssign={initialData?.filter(reg => selectedRowIds.includes(reg.id)) || []}
                onFinished={handleGroupActionFinished}
            />
        </Dialog>

        <Dialog open={isAssignManualDialogOpen} onOpenChange={setIsAssignManualDialogOpen}>
            <AssignSubcommitteeManualDialog
                registrationsToAssign={initialData?.filter(reg => selectedRowIds.includes(reg.id)) || []}
                subCommittees={subCommittees || []}
                onFinished={handleGroupActionFinished}
            />
        </Dialog>
    </>
  );
}
