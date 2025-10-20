
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
import { MoreHorizontal, PlusCircle, Trash2 } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import type { EarlyInternship } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';

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


export function EarlyInternshipTable() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [internshipToDelete, setInternshipToDelete] = useState<EarlyInternship | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);


  const earlyInternshipsCollectionRef = useMemoFirebase(
    () => collection(firestore, 'earlyInternships'),
    [firestore]
  );
  
  const { data: internships, isLoading } = useCollection<EarlyInternship>(earlyInternshipsCollectionRef);
  
  useEffect(() => {
    setSelectedRowIds([]);
  }, [internships]);


  const toDate = (timestamp: any): Date | undefined => {
    if (!timestamp) return undefined;
    if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
    }
    return timestamp;
  };
  
  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    setSelectedRowIds(checked ? (internships || []).map(i => i.id) : []);
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

  const isAllSelected = internships && selectedRowIds.length === internships.length;
  const isSomeSelected = selectedRowIds.length > 0 && selectedRowIds.length < (internships?.length ?? 0);

  return (
    <>
        <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
            <div>
                <CardTitle>Danh sách Sinh viên</CardTitle>
                <CardDescription>Các sinh viên đang hoặc đã hoàn thành thực tập sớm.</CardDescription>
            </div>
             {selectedRowIds.length > 0 && (
                  <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Xóa ({selectedRowIds.length})
                  </Button>
              )}
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
                <TableHead>Sinh viên</TableHead>
                <TableHead>Công ty</TableHead>
                <TableHead>GVHD</TableHead>
                <TableHead>Ngày bắt đầu</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {internships?.map((internship, index) => (
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
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(internship)}>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
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
    </>
  );
}

