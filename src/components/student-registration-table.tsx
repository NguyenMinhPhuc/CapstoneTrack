

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
  DropdownMenuPortal,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Upload, Search, ListFilter, Users, Move, Edit, Star, XCircle } from 'lucide-react';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import type { DefenseRegistration, StudentWithRegistrationDetails, Student } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { AddStudentRegistrationForm } from './add-student-registration-form';
import { ImportRegistrationsDialog } from './import-registrations-dialog';
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


interface StudentRegistrationTableProps {
  sessionId: string;
  initialData: StudentWithRegistrationDetails[] | null;
  isLoading: boolean;
}

const studentStatusLabel: Record<Student['status'], string> = {
  studying: 'Đang học',
  reserved: 'Bảo lưu',
  dropped_out: 'Đã nghỉ',
  graduated: 'Đã tốt nghiệp',
};

const studentStatusColorClass: Record<Student['status'], string> = {
  studying: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700',
  reserved: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-700',
  dropped_out: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700',
  graduated: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700',
};

const registrationStatusLabel: Record<DefenseRegistration['registrationStatus'], string> = {
    reporting: 'Báo cáo',
    exempted: 'Đặc cách',
    withdrawn: 'Bỏ báo cáo',
};

const registrationStatusVariant: Record<DefenseRegistration['registrationStatus'], 'default' | 'secondary' | 'destructive'> = {
    reporting: 'default',
    exempted: 'secondary',
    withdrawn: 'destructive',
};



export function StudentRegistrationTable({ sessionId, initialData, isLoading }: StudentRegistrationTableProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddByClassDialogOpen, setIsAddByClassDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isEditGroupDialogOpen, setIsEditGroupDialogOpen] = useState(false);
  const [isExemptionDialogOpen, setIsExemptionDialogOpen] = useState(false);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);


  const [selectedRegistration, setSelectedRegistration] = useState<DefenseRegistration | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [supervisorFilter, setSupervisorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  
  useEffect(() => {
    setSelectedRowIds([]);
  }, [initialData]);

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
      const statusMatch = statusFilter === 'all' || reg.registrationStatus === statusFilter;

      return searchMatch && supervisorMatch && statusMatch;
    });
  }, [initialData, searchTerm, supervisorFilter, statusFilter]);

  const handleEditClick = (registration: DefenseRegistration) => {
    setSelectedRegistration(registration);
    setIsEditDialogOpen(true);
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
                        <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Move className="mr-2 h-4 w-4" />
                                    Chuyển đợt ({selectedRowIds.length})
                                </Button>
                            </DialogTrigger>
                            <MoveRegistrationsDialog
                                currentSessionId={sessionId}
                                registrationsToMove={initialData?.filter(reg => selectedRowIds.includes(reg.id)) || []}
                                onFinished={handleGroupActionFinished}
                            />
                        </Dialog>
                         <Dialog open={isEditGroupDialogOpen} onOpenChange={setIsEditGroupDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" disabled={selectedRowIds.length > 2}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Cập nhật đề tài ({selectedRowIds.length})
                                </Button>
                            </DialogTrigger>
                             <EditGroupRegistrationForm
                                registrations={initialData?.filter(reg => selectedRowIds.includes(reg.id)) || []}
                                onFinished={handleGroupActionFinished}
                            />
                        </Dialog>
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
                  <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                            <Upload className="mr-2 h-4 w-4" />
                            Nhập từ Excel
                        </Button>
                    </DialogTrigger>
                    <ImportRegistrationsDialog sessionId={sessionId} onFinished={() => setIsImportDialogOpen(false)} />
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
                <TableHead>MSSV</TableHead>
                <TableHead>Trạng thái SV</TableHead>
                <TableHead>Tên đề tài</TableHead>
                <TableHead>GVHD</TableHead>
                <TableHead>Trạng thái ĐK</TableHead>
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
                    <TableCell className="font-medium">{reg.studentName}</TableCell>
                    <TableCell>{reg.studentId}</TableCell>
                    <TableCell>
                        <Badge className={cn(studentStatusColorClass[reg.status])}>
                            {studentStatusLabel[reg.status]}
                        </Badge>
                    </TableCell>
                    <TableCell>{reg.projectTitle || 'Chưa có'}</TableCell>
                    <TableCell>{reg.supervisorName || 'Chưa có'}</TableCell>
                    <TableCell>
                       <Badge variant={registrationStatusVariant[reg.registrationStatus]}>
                          {registrationStatusLabel[reg.registrationStatus]}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClick(reg)}>Sửa</DropdownMenuItem>
                          <DropdownMenuSeparator />
                           <DropdownMenuItem onClick={() => {
                                setIsExemptionDialogOpen(true);
                                setSelectedRowIds([reg.id]);
                           }}>
                                Xét đặc cách
                           </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => {
                                setIsWithdrawDialogOpen(true);
                                setSelectedRowIds([reg.id]);
                           }}>
                                Bỏ báo cáo
                           </DropdownMenuItem>
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
                  <TableCell colSpan={9} className="text-center">
                    Chưa có sinh viên nào được thêm vào đợt này.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
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
    </>
  );
}
