
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
  onSupervisorSelect?: (supervisor: Supervisor | null) => void;
}

const NO_SUPERVISOR_VALUE = "__NONE__";

export function SupervisorSelect({ value, onChange, onSupervisorSelect }: SupervisorSelectProps) {
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

  const handleValueChange = (supervisorId: string) => {
    if (supervisorId === NO_SUPERVISOR_VALUE) {
        onChange(NO_SUPERVISOR_VALUE);
        onSupervisorSelect?.(null);
    } else {
        const selected = supervisors?.find(s => s.id === supervisorId);
        if (selected) {
            onChange(supervisorId);
            onSupervisorSelect?.(selected);
        }
    }
  }
  
  const selectedSupervisor = supervisors?.find(s => s.id === value);
  const displayValue = selectedSupervisor ? `${selectedSupervisor.firstName} ${selectedSupervisor.lastName}` : (value === NO_SUPERVISOR_VALUE ? "Chưa có GVHD" : "Chọn giáo viên hướng dẫn");


  return (
    <Select onValueChange={handleValueChange} value={value || NO_SUPERVISOR_VALUE} disabled={isLoading}>
      <SelectTrigger>
        <SelectValue placeholder={isLoading ? "Đang tải..." : displayValue} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_SUPERVISOR_VALUE}>Chưa có GVHD</SelectItem>
        {supervisors?.map(supervisor => {
            const fullName = `${supervisor.firstName} ${supervisor.lastName}`.trim();
            if (!fullName) return null;
            
            return (
              <SelectItem key={supervisor.id} value={supervisor.id}>
                {fullName}
              </SelectItem>
            )
        })}
      </SelectContent>
    </Select>
  );
}
