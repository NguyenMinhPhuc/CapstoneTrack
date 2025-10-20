
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

export function EarlyInternshipTable() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const earlyInternshipsCollectionRef = useMemoFirebase(
    () => collection(firestore, 'earlyInternships'),
    [firestore]
  );
  
  const { data: internships, isLoading } = useCollection<EarlyInternship>(earlyInternshipsCollectionRef);

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
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Thêm Sinh viên
          </Button>
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
                <TableCell>{internship.startDate?.toDate().toLocaleDateString()}</TableCell>
                <TableCell>{internship.status}</TableCell>
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
