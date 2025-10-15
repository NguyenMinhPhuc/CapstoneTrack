
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
  value: string;
  onChange: (value: string) => void;
}

export function SupervisorCombobox({ value, onChange }: SupervisorComboboxProps) {
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
        value: fullName.toLowerCase(),
        label: fullName,
      };
    }).filter(opt => opt.label);
  }, [supervisors]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
            <ChevronsUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 shrink-0 opacity-50" />
            <Command>
                 <CommandInput
                    value={value}
                    onValueChange={onChange}
                    placeholder="Chọn hoặc nhập tên GVHD..."
                    className="w-full"
                />
            </Command>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandList>
            <CommandEmpty>
              {isLoading ? 'Đang tải...' : 'Không tìm thấy giáo viên.'}
            </CommandEmpty>
            <CommandGroup>
              {supervisorOptions.map(option => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={currentValue => {
                    onChange(currentValue === value ? '' : option.label);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.label ? 'opacity-100' : 'opacity-0'
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
