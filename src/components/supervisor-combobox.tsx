
'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Supervisor } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface SupervisorComboboxProps {
  value: string | null;
  onChange: (value: string | null) => void;
  onSupervisorSelect?: (supervisor: Supervisor | null) => void;
  disabled?: boolean;
}

export function SupervisorCombobox({ value, onChange, onSupervisorSelect, disabled = false }: SupervisorComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const supervisorsCollectionRef = useMemoFirebase(
    () => collection(firestore, 'supervisors'),
    [firestore]
  );
  const {
    data: supervisors,
    isLoading,
    error,
  } = useCollection<Supervisor>(supervisorsCollectionRef);

  React.useEffect(() => {
    if (error) {
      console.error('Error fetching supervisors:', error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không thể tải danh sách giáo viên hướng dẫn.',
      });
    }
  }, [error, toast]);

  const supervisorOptions = React.useMemo(() => {
    if (!supervisors) return [];
    return supervisors.map(supervisor => {
      const fullName = `${supervisor.firstName} ${supervisor.lastName}`.trim();
      return {
        ...supervisor,
        value: supervisor.id,
        label: fullName,
      };
    }).filter(opt => opt.label);
  }, [supervisors]);

  const selectedSupervisorLabel = supervisorOptions.find(opt => opt.value === value)?.label || "Chọn giáo viên...";

  const handleSelect = (currentValue: string) => {
    const newValue = currentValue === value ? null : currentValue;
    const selectedSupervisor = supervisors?.find(s => s.id === newValue) || null;
    onChange(newValue);
    if(onSupervisorSelect) {
      onSupervisorSelect(selectedSupervisor);
    }
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={isLoading || disabled}
        >
          {isLoading ? "Đang tải..." : selectedSupervisorLabel}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Tìm giáo viên..." />
          <CommandList>
            <CommandEmpty>Không tìm thấy giáo viên.</CommandEmpty>
            <CommandGroup>
              {supervisorOptions.map(option => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.email}`} // Search by name and email
                  onSelect={() => handleSelect(option.value)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
