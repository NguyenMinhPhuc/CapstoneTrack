

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
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { EarlyInternship } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from './ui/badge';

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

  const earlyInternshipsCollectionRef = useMemoFirebase(
    () => collection(firestore, 'earlyInternships'),
    [firestore]
  );
  
  const { data: internships, isLoading } = useCollection<EarlyInternship>(earlyInternshipsCollectionRef);

  const toDate = (timestamp: any): Date | undefined => {
    if (!timestamp) return undefined;
    if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
    }
    return timestamp;
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Danh sách Sinh viên</CardTitle>
            <CardDescription>Các sinh viên đang hoặc đã hoàn thành thực tập sớm.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
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
              <TableRow key={internship.id}>
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
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
