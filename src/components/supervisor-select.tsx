
'use client';

import { useEffect } from 'react';
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

const NO_SUPERVISOR_VALUE = "__NONE__";

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
    <Select onValueChange={onChange} value={value || NO_SUPERVISOR_VALUE} disabled={isLoading}>
      <SelectTrigger>
        <SelectValue placeholder={isLoading ? "Đang tải..." : "Chọn giáo viên hướng dẫn"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_SUPERVISOR_VALUE}>Chưa có GVHD</SelectItem>
        {supervisors?.map(supervisor => {
            // Ensure supervisor has a valid name before rendering
            if (!supervisor.firstName || !supervisor.lastName) {
              return null;
            }
            const fullName = `${supervisor.firstName} ${supervisor.lastName}`.trim();
            // Also check if the combined name is not empty
            if (!fullName) return null;
            
            return (
              <SelectItem key={supervisor.id} value={fullName}>
                {fullName}
              </SelectItem>
            )
        })}
      </SelectContent>
    </Select>
  );
}
