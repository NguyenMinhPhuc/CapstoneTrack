
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
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Check, X, CheckCircle, Clock } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import type { EarlyInternship } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

interface EarlyInternshipGuidanceTableProps {
  supervisorId: string;
}

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


export function EarlyInternshipGuidanceTable({ supervisorId }: EarlyInternshipGuidanceTableProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const internshipsQuery = useMemoFirebase(
    () => query(collection(firestore, 'earlyInternships'), where('supervisorId', '==', supervisorId)),
    [firestore, supervisorId]
  );
  
  const { data: internships, isLoading } = useCollection<EarlyInternship>(internshipsQuery);

  const toDate = (timestamp: any): Date | undefined => {
    if (!timestamp) return undefined;
    if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
    }
    return timestamp;
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

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Danh sách Sinh viên</CardTitle>
          <CardDescription>Các sinh viên đã chọn bạn làm người hướng dẫn thực tập sớm.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sinh viên</TableHead>
              <TableHead>Công ty</TableHead>
              <TableHead>Ngày bắt đầu</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {internships?.map((internship) => (
              <TableRow key={internship.id}>
                <TableCell>
                  <div className="font-medium">{internship.studentName}</div>
                  <div className="text-sm text-muted-foreground">{internship.studentIdentifier}</div>
                </TableCell>
                <TableCell>{internship.companyName}</TableCell>
                <TableCell>
                  {toDate(internship.startDate) ? format(toDate(internship.startDate)!, 'PPP') : 'N/A'}
                </TableCell>
                <TableCell>
                    <Badge variant={statusVariant[internship.status]}>
                        {statusLabel[internship.status]}
                    </Badge>
                </TableCell>
                <TableCell className="text-right">
                    {internship.status === 'pending_approval' && (
                        <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleStatusChange(internship.id, 'ongoing')}>
                                <Check className="mr-2 h-4 w-4" /> Duyệt
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleStatusChange(internship.id, 'rejected', 'Không phù hợp')}>
                                <X className="mr-2 h-4 w-4" /> Từ chối
                            </Button>
                        </div>
                    )}
                    {internship.status === 'ongoing' && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleStatusChange(internship.id, 'completed', 'Hoàn thành tốt')}>
                                     <CheckCircle className="mr-2 h-4 w-4" />
                                    <span>Kết thúc Thực tập</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator/>
                                <DropdownMenuItem className="text-destructive" onClick={() => handleStatusChange(internship.id, 'cancelled', 'Không hoàn thành')}>
                                    <X className="mr-2 h-4 w-4" />
                                    <span>Hủy Thực tập</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
