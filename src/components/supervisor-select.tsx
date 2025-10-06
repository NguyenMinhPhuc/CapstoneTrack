
'use client';

import { useEffect, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Supervisor } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface SupervisorSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function SupervisorSelect({ value, onChange }: SupervisorSelectProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const supervisorsCollectionRef = useMemoFirebase(() => collection(firestore, 'supervisors'), [firestore]);
  const { data: supervisors, isLoading, error } = useCollection<Supervisor>(supervisorsCollectionRef);

  useEffect(() => {
    if (error) {
      console.error("Error fetching supervisors:", error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể tải danh sách giáo viên hướng dẫn.',
      });
    }
  }, [error, toast]);

  return (
    <Select onValueChange={onChange} value={value} disabled={isLoading}>
      <SelectTrigger>
        <SelectValue placeholder={isLoading ? "Đang tải..." : "Chọn giáo viên hướng dẫn"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">Chưa có GVHD</SelectItem>
        {supervisors?.map(supervisor => (
          <SelectItem key={supervisor.id} value={`${supervisor.firstName} ${supervisor.lastName}`}>
            {`${supervisor.firstName} ${supervisor.lastName}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
