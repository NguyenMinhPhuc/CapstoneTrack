
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
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
import { MoreHorizontal, PlusCircle, Trash2, CheckCircle, Clock, X, ChevronDown, Search, ArrowUpDown, ChevronUp } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, deleteDoc, writeBatch, updateDoc, query } from 'firebase/firestore';
import type { EarlyInternship } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent } from './ui/dialog';
import { RejectionReasonDialog } from './rejection-reason-dialog';

const statusLabel: Record<EarlyInternship['status'], string> = {
  pending_approval: 'Chờ duyệt',
  ongoing: 'Đang thực tập',
  completed: 'Hoàn thành',
  rejected: 'Bị từ chối',
  cancelled: 'Đã hủy',
};

const statusVariant: Record<EarlyInternship['status'], 'secondary' | 'default' | 'outline' | 'destructive'> = {
  pending_approval: 'secondary',
  ongoing: 'default',
  completed: 'outline',
  rejected: 'destructive',
  cancelled: 'destructive',
};

type SortKey = 'studentName' | 'companyName' | 'supervisorName' | 'startDate';
type SortDirection = 'asc' | 'desc';


export function EarlyInternshipTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [internshipToDelete, setInternshipToDelete] = useState<EarlyInternship | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedInternship, setSelectedInternship] = useState<EarlyInternship | null>(null);
  
  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [supervisorFilter, setSupervisorFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null);


  const earlyInternshipsCollectionRef = useMemoFirebase(
    () => collection(firestore, 'earlyInternships'),
    [firestore]
  );
  
  const { data: internships, isLoading } = useCollection<EarlyInternship>(earlyInternshipsCollectionRef);
  
  useEffect(() => {
    setSelectedRowIds([]);
  }, [internships]);
  
  const { uniqueCompanies, uniqueSupervisors } = useMemo(() => {
    if (!internships) return { uniqueCompanies: [], uniqueSupervisors: [] };
    const companies = new Set<string>();
    const supervisors = new Set<string>();
    internships.forEach(internship => {
      if (internship.companyName) companies.add(internship.companyName);
      if (internship.supervisorName) supervisors.add(internship.supervisorName);
    });
    return {
      uniqueCompanies: Array.from(companies).sort(),
      uniqueSupervisors: Array.from(supervisors).sort(),
    };
  }, [internships]);
  
  const toDate = (timestamp: any): Date | undefined => {
    if (!timestamp) return undefined;
    if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
    }
    return timestamp;
  };

  const filteredInternships = useMemo(() => {
    if (!internships) return [];
    let sortableInternships = [...internships];

     if (sortConfig !== null) {
      sortableInternships.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        
        // Specific handling for date fields
        if (sortConfig.key === 'startDate') {
          const dateA = toDate(aValue)?.getTime() || 0;
          const dateB = toDate(bValue)?.getTime() || 0;
           if (dateA < dateB) return sortConfig.direction === 'asc' ? -1 : 1;
           if (dateA > dateB) return sortConfig.direction === 'asc' ? 1 : -1;
           return 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return sortableInternships.filter(internship => {
      const term = searchTerm.toLowerCase();
      const searchMatch =
        internship.studentName.toLowerCase().includes(term) ||
        internship.studentIdentifier.toLowerCase().includes(term) ||
        internship.companyName.toLowerCase().includes(term) ||
        internship.supervisorName.toLowerCase().includes(term);

      const companyMatch = companyFilter === 'all' || internship.companyName === companyFilter;
      const supervisorMatch = supervisorFilter === 'all' || internship.supervisorName === supervisorFilter;

      return searchMatch && companyMatch && supervisorMatch;
    });
  }, [internships, searchTerm, companyFilter, supervisorFilter, sortConfig]);

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
    return sortConfig.direction === 'asc' ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />;
  };

  
  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    setSelectedRowIds(checked ? (filteredInternships || []).map(i => i.id) : []);
  };

  const handleRowSelect = (id: string, checked: boolean) => {
    setSelectedRowIds(prev =>
      checked ? [...prev, id] : prev.filter(rowId => rowId !== id)
    );
  };
  
  const handleDeleteClick = (internship: EarlyInternship) => {
    setInternshipToDelete(internship);
    setIsDeleteDialogOpen(true);
  };

  const handleRejectClick = (internship: EarlyInternship) => {
    setSelectedInternship(internship);
    setIsRejectDialogOpen(true);
  };
  
  const handleStatusChange = async (internshipId: string, status: EarlyInternship['status'], note?: string) => {
    const docRef = doc(firestore, 'earlyInternships', internshipId);
    const dataToUpdate: Partial<EarlyInternship> = { status, statusNote: note || '' };
    
    updateDoc(docRef, dataToUpdate)
      .then(() => {
        toast({ title: 'Thành công', description: 'Đã cập nhật trạng thái thực tập.' });
      })
      .catch((error) => {
        const contextualError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: dataToUpdate
        });
        errorEmitter.emit('permission-error', contextualError);
      });
  };
  
  const confirmDelete = async () => {
    const batch = writeBatch(firestore);
    let count = 0;

    if (selectedRowIds.length > 0) {
        selectedRowIds.forEach(id => {
            batch.delete(doc(firestore, 'earlyInternships', id));
        });
        count = selectedRowIds.length;
    } else if (internshipToDelete) {
        batch.delete(doc(firestore, 'earlyInternships', internshipToDelete.id));
        count = 1;
    }

    if (count === 0) return;

    try {
      await batch.commit();
      toast({
        title: 'Thành công',
        description: `Đã xóa ${count} đăng ký thực tập sớm.`,
      });
    } catch (error) {
       const contextualError = new FirestorePermissionError({
          path: 'batch delete on earlyInternships',
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', contextualError);
    } finally {
        setIsDeleteDialogOpen(false);
        setInternshipToDelete(null);
        setSelectedRowIds([]);
    }
  };


  if (isLoading) {
    return (
      <Card>
          <CardHeader>
              <Skeleton className="h-8 w-1/4" />
          </CardHeader>
          <CardContent>
              <Skeleton className="h-64 w-full" />
          </CardContent>
      </Card>
    )
  }

  const isAllSelected = filteredInternships && selectedRowIds.length > 0 && selectedRowIds.length === filteredInternships.length;
  const isSomeSelected = selectedRowIds.length > 0 && selectedRowIds.length < (filteredInternships?.length ?? 0);

  return (
    <>
        <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <CardTitle>Danh sách Sinh viên</CardTitle>
                <CardDescription>Các sinh viên đang hoặc đã hoàn thành thực tập sớm.</CardDescription>
            </div>
             <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                {selectedRowIds.length > 0 && (
                    <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Xóa ({selectedRowIds.length})
                    </Button>
                )}
                 <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Tìm kiếm..."
                    className="w-full rounded-lg bg-background pl-8 sm:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                 <Select value={companyFilter} onValueChange={setCompanyFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Lọc theo công ty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả công ty</SelectItem>
                    {uniqueCompanies.map((company) => (
                      <SelectItem key={company} value={company}>{company}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={supervisorFilter} onValueChange={setSupervisorFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Lọc theo GVHD" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả GVHD</SelectItem>
                    {uniqueSupervisors.map((supervisor) => (
                      <SelectItem key={supervisor} value={supervisor}>{supervisor}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <TableHead className="w-[50px]">STT</TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('studentName')} className="px-0 hover:bg-transparent">
                        Sinh viên {getSortIcon('studentName')}
                    </Button>
                </TableHead>
                <TableHead>
                     <Button variant="ghost" onClick={() => requestSort('companyName')} className="px-0 hover:bg-transparent">
                        Công ty {getSortIcon('companyName')}
                    </Button>
                </TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('supervisorName')} className="px-0 hover:bg-transparent">
                        GVHD {getSortIcon('supervisorName')}
                    </Button>
                </TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('startDate')} className="px-0 hover:bg-transparent">
                        Ngày bắt đầu {getSortIcon('startDate')}
                    </Button>
                </TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredInternships?.map((internship, index) => (
                <TableRow key={internship.id} data-state={selectedRowIds.includes(internship.id) && "selected"}>
                    <TableCell>
                        <Checkbox
                            checked={selectedRowIds.includes(internship.id)}
                            onCheckedChange={(checked) => handleRowSelect(internship.id, !!checked)}
                        />
                    </TableCell>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                    <div className="font-medium">{internship.studentName}</div>
                    <div className="text-sm text-muted-foreground">{internship.studentIdentifier}</div>
                    </TableCell>
                    <TableCell>{internship.companyName}</TableCell>
                    <TableCell>{internship.supervisorName}</TableCell>
                    <TableCell>
                    {toDate(internship.startDate) ? format(toDate(internship.startDate)!, 'PPP') : 'N/A'}
                    </TableCell>
                    <TableCell>
                        <Badge variant={statusVariant[internship.status]}>
                            {statusLabel[internship.status]}
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
                                <DropdownMenuItem>Sửa thông tin</DropdownMenuItem>
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                        <span>Thay đổi trạng thái</span>
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                        <DropdownMenuSubContent>
                                            <DropdownMenuItem onClick={() => handleStatusChange(internship.id, 'ongoing')} disabled={internship.status === 'ongoing'}>
                                                <Clock className="mr-2 h-4 w-4" />
                                                <span>{statusLabel.ongoing}</span>
                                            </DropdownMenuItem>
                                             <DropdownMenuItem onClick={() => handleStatusChange(internship.id, 'completed')} disabled={internship.status === 'completed'}>
                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                <span>{statusLabel.completed}</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-500" onClick={() => handleStatusChange(internship.id, 'cancelled')} disabled={internship.status === 'cancelled'}>
                                                <X className="mr-2 h-4 w-4" />
                                                <span>{statusLabel.cancelled}</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                </DropdownMenuSub>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteClick(internship)}>Xóa</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </CardContent>
        </Card>
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Bạn có chắc chắn không?</AlertDialogTitle>
                <AlertDialogDescription>
                    Hành động này không thể hoàn tác. Thao tác này sẽ xóa vĩnh viễn thông tin của {selectedRowIds.length > 0 ? `${selectedRowIds.length} đăng ký đã chọn` : `đăng ký của ${internshipToDelete?.studentName}`}.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => { setIsDeleteDialogOpen(false); setInternshipToDelete(null); }}>Hủy</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Tiếp tục</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
            <DialogContent>
                {selectedInternship && (
                    <RejectionReasonDialog
                        registration={selectedInternship as any} // Cast as any because the dialog expects DefenseRegistration
                        onConfirm={(reason) => {
                            handleStatusChange(selectedInternship.id, 'rejected', reason);
                            setIsRejectDialogOpen(false);
                            setSelectedInternship(null);
                        }}
                        onCancel={() => {
                            setIsRejectDialogOpen(false);
                            setSelectedInternship(null);
                        }}
                    />
                )}
            </DialogContent>
        </Dialog>
    </>
  );
}
