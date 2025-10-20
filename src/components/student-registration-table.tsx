

'use client';

import { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
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
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Search, Users, Move, Edit, Star, XCircle, RefreshCw, GitMerge, UserCheck, Briefcase, GraduationCap, Trash2, FileDown, ArrowUpDown } from 'lucide-react';
import { useFirestore, errorEmitter, FirestorePermissionError, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, writeBatch, updateDoc } from 'firebase/firestore';
import type { DefenseRegistration, StudentWithRegistrationDetails, DefenseSubCommittee } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { AddStudentRegistrationForm } from './add-student-registration-form';
import { EditStudentRegistrationForm } from './edit-student-registration-form';
import { Input } from './ui/input';
import { AddStudentsByClassDialog } from './add-students-by-class-dialog';
import { Badge } from './ui/badge';
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
import { cn } from '@/lib/utils';


interface StudentRegistrationTableProps {
  sessionId: string;
  initialData: StudentWithRegistrationDetails[] | null;
  isLoading: boolean;
}

type SortKey = 'studentName' | 'projectTitle' | 'supervisorName' | 'internshipSupervisorName' | 'subCommitteeName';
type SortDirection = 'asc' | 'desc';

type ReportStatusType = 'graduation' | 'internship' | 'both';

const registrationStatusLabel: Record<DefenseRegistration['graduationStatus'], string> = {
    reporting: 'Báo cáo',
    exempted: 'Đặc cách',
    withdrawn: 'Bỏ báo cáo',
    not_reporting: 'Không BC',
    completed: 'Hoàn thành',
};

const registrationStatusVariant: Record<DefenseRegistration['graduationStatus'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
    reporting: 'default',
    exempted: 'secondary',
    withdrawn: 'destructive',
    not_reporting: 'outline',
    completed: 'default',
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);


  const [selectedRegistration, setSelectedRegistration] = useState<DefenseRegistration | null>(null);
  const [registrationToDelete, setRegistrationToDelete] = useState<DefenseRegistration | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [supervisorFilter, setSupervisorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [subcommitteeFilter, setSubcommitteeFilter] = useState('all');
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null);
  
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

  const sortedAndFilteredRegistrations = useMemo(() => {
    if (!initialData) return [];
    
    let filtered = initialData.filter(reg => {
      const term = searchTerm.toLowerCase();
      const nameMatch = reg.studentName.toLowerCase().includes(term);
      const idMatch = reg.studentId.toLowerCase().includes(term);
      const searchMatch = nameMatch || idMatch;

      const supervisorMatch = supervisorFilter === 'all' || reg.supervisorName === supervisorFilter;
      const statusMatch = statusFilter === 'all' || reg.graduationStatus === statusFilter || reg.internshipStatus === statusFilter;
      
      const subcommitteeName = subCommitteeMap.get(reg.subCommitteeId || '') || '';
      const subcommitteeMatch = subcommitteeFilter === 'all' 
          || (subcommitteeFilter === UNASSIGNED_VALUE && !reg.subCommitteeId)
          || reg.subCommitteeId === subcommitteeFilter;

      return searchMatch && supervisorMatch && statusMatch && subcommitteeMatch;
    });

    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        let aValue: string | undefined;
        let bValue: string | undefined;
        
        if (sortConfig.key === 'subCommitteeName') {
            aValue = subCommitteeMap.get(a.subCommitteeId || '');
            bValue = subCommitteeMap.get(b.subCommitteeId || '');
        } else {
            aValue = a[sortConfig.key];
            bValue = b[sortConfig.key];
        }

        aValue = aValue || '';
        bValue = bValue || '';

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return filtered;

  }, [initialData, searchTerm, supervisorFilter, statusFilter, subcommitteeFilter, sortConfig, subCommitteeMap]);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
    }
    return sortConfig.direction === 'asc' ? <ArrowUpDown className="ml-2 h-4 w-4" /> : <ArrowUpDown className="ml-2 h-4 w-4" />;
  };

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

  const handleRevertToReporting = async (registrationIds: string[], type: ReportStatusType) => {
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

  const handleDeleteClick = (registration: DefenseRegistration) => {
    setRegistrationToDelete(registration);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    const batch = writeBatch(firestore);
    let count = 0;

    if (selectedRowIds.length > 0) {
      selectedRowIds.forEach(id => {
        const registrationDocRef = doc(firestore, 'defenseRegistrations', id);
        batch.delete(registrationDocRef);
      });
      count = selectedRowIds.length;
    } else if (registrationToDelete) {
      const registrationDocRef = doc(firestore, 'defenseRegistrations', registrationToDelete.id);
      batch.delete(registrationDocRef);
      count = 1;
    }

    if (count === 0) return;

    try {
      await batch.commit();
      toast({
        title: 'Thành công',
        description: `Đã xóa ${count} sinh viên khỏi đợt báo cáo.`,
      });
    } catch (error) {
      const contextualError = new FirestorePermissionError({
        path: 'batch delete on defenseRegistrations',
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', contextualError);
    } finally {
      setIsDeleteDialogOpen(false);
      setRegistrationToDelete(null);
      setSelectedRowIds([]);
    }
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
        setSelectedRowIds(sortedAndFilteredRegistrations?.map(s => s.id) || []);
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

  const exportToExcel = () => {
    const dataToExport = sortedAndFilteredRegistrations.map((reg, index) => ({
      'STT': index + 1,
      'MSSV': reg.studentId,
      'Họ và Tên': reg.studentName,
      'Lớp': reg.className || '',
      'Tên đề tài': reg.projectTitle || 'Chưa có',
      'GVHD TN': reg.supervisorName || 'Chưa có',
      'GVHD chấm TT': reg.internshipSupervisorName || 'Chưa có',
      'NSHD tại ĐV': reg.internship_companySupervisorName || 'Chưa có',
      'Đơn vị Thực tập': reg.internship_companyName || 'Chưa có',
      'Tiểu ban': subCommitteeMap.get(reg.subCommitteeId || '') || 'Chưa phân công',
      'Trạng thái TN': registrationStatusLabel[reg.graduationStatus],
      'Ghi chú TN': reg.graduationStatusNote || '',
      'Trạng thái TT': registrationStatusLabel[reg.internshipStatus],
      'Ghi chú TT': reg.internshipStatusNote || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachSV');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 5 }, // STT
      { wch: 15 }, // MSSV
      { wch: 25 }, // Họ và Tên
      { wch: 15 }, // Lớp
      { wch: 40 }, // Tên đề tài
      { wch: 25 }, // GVHD TN
      { wch: 25 }, // GVHD chấm TT
      { wch: 25 }, // NSHD tại ĐV
      { wch: 30 }, // Đơn vị Thực tập
      { wch: 20 }, // Tiểu ban
      { wch: 15 }, // Trạng thái TN
      { wch: 30 }, // Ghi chú TN
      { wch: 15 }, // Trạng thái TT
      { wch: 30 }, // Ghi chú TT
    ];

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(data, `Danh_sach_sinh_vien_dot_${sessionId}.xlsx`);
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

  const isAllSelected = sortedAndFilteredRegistrations && selectedRowIds.length > 0 && selectedRowIds.length === sortedAndFilteredRegistrations.length;
  const isSomeSelected = selectedRowIds.length > 0 && (!sortedAndFilteredRegistrations || selectedRowIds.length < sortedAndFilteredRegistrations.length);

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
                                <Button variant="outline" size="sm">
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

                        <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Xóa ({selectedRowIds.length})
                        </Button>
                    </>
                )}
            </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <div className="flex w-full sm:w-auto flex-wrap gap-2">
                <div className="relative w-full sm:w-auto flex-grow">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                      type="search"
                      placeholder="Tìm theo tên hoặc MSSV..."
                      className="pl-8 w-full"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                 <Select value={subcommitteeFilter} onValueChange={setSubcommitteeFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Lọc theo tiểu ban" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả tiểu ban</SelectItem>
                        <SelectItem value={UNASSIGNED_VALUE}>Chưa phân công</SelectItem>
                        {subCommittees?.map(sc => (
                            <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>
                        ))}
                    </SelectContent>
                 </Select>
                 <Select value={supervisorFilter} onValueChange={setSupervisorFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Lọc theo GVHD" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả GVHD</SelectItem>
                        {uniqueSupervisors.map(supervisor => (
                            <SelectItem key={supervisor} value={supervisor}>{supervisor}</SelectItem>
                        ))}
                    </SelectContent>
                 </Select>
                 <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Lọc theo trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả trạng thái</SelectItem>
                        {Object.entries(registrationStatusLabel).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                    </SelectContent>
                 </Select>
              </div>
              <div className="flex w-full sm:w-auto gap-2">
                  <Button variant="outline" className="w-full" onClick={exportToExcel}>
                      <FileDown className="mr-2 h-4 w-4" />
                      Xuất Excel
                  </Button>
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
                 <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('studentName')} className="px-0 hover:bg-transparent">
                        Tên sinh viên {getSortIcon('studentName')}
                    </Button>
                </TableHead>
                <TableHead>
                     <Button variant="ghost" onClick={() => requestSort('projectTitle')} className="px-0 text-left hover:bg-transparent">
                        Tên đề tài {getSortIcon('projectTitle')}
                    </Button>
                </TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('supervisorName')} className="px-0 hover:bg-transparent">
                        GVHD TN {getSortIcon('supervisorName')}
                    </Button>
                </TableHead>
                <TableHead>
                     <Button variant="ghost" onClick={() => requestSort('internshipSupervisorName')} className="px-0 hover:bg-transparent">
                        GVHD TT {getSortIcon('internshipSupervisorName')}
                    </Button>
                </TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('subCommitteeName')} className="px-0 hover:bg-transparent">
                        Tiểu ban {getSortIcon('subCommitteeName')}
                    </Button>
                </TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredRegistrations && sortedAndFilteredRegistrations.length > 0 ? (
                sortedAndFilteredRegistrations.map((reg, index) => (
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
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteClick(reg)}>
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
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn không?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Thao tác này sẽ xóa vĩnh viễn đăng ký của 
              {selectedRowIds.length > 0 ? ` ${selectedRowIds.length} sinh viên đã chọn` : (registrationToDelete ? ` sinh viên ${registrationToDelete.studentName}` : ' sinh viên này')}
              khỏi đợt báo cáo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setRegistrationToDelete(null); setIsDeleteDialogOpen(false); }}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


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
        
        <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
            <WithdrawRegistrationForm
                registrations={initialData?.filter(reg => selectedRowIds.includes(reg.id)) || []}
                onFinished={handleGroupActionFinished}
            />
        </Dialog>
        
        <Dialog open={isExemptionDialogOpen} onOpenChange={setIsExemptionDialogOpen}>
            <SpecialExemptionForm
                registrations={initialData?.filter(reg => selectedRowIds.includes(reg.id)) || []}
                onFinished={handleGroupActionFinished}
            />
        </Dialog>
    </>
  );
}
