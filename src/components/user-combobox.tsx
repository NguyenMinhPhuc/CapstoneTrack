
'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import type { SystemUser } from '@/lib/types';

interface UserComboboxProps {
  users: SystemUser[];
  selectedUserIds: string[];
  onSelectionChange: (userIds: string[], userObjects: SystemUser[]) => void;
  isLoading: boolean;
}

export function UserCombobox({
  users,
  selectedUserIds,
  onSelectionChange,
  isLoading,
}: UserComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (userId: string) => {
    const newSelection = [...selectedUserIds];
    const userIndex = newSelection.indexOf(userId);

    if (userIndex > -1) {
      newSelection.splice(userIndex, 1);
    } else {
      newSelection.push(userId);
    }
    const selectedUsers = users.filter(u => newSelection.includes(u.id));
    onSelectionChange(newSelection, selectedUsers);
  };
  
  const selectedUsers = users.filter(user => selectedUserIds.includes(user.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative flex min-h-10 w-full flex-wrap items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
          {selectedUsers.length > 0 ? (
            selectedUsers.map(user => (
              <Badge key={user.id} variant="secondary" className="gap-1.5 pr-1">
                {user.displayName || user.email}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelect(user.id);
                  }}
                  className="rounded-full hover:bg-muted-foreground/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground">Chọn người nhận...</span>
          )}
           <ChevronsUpDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 shrink-0 opacity-50" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Tìm theo tên hoặc email..." />
          <CommandList>
            <CommandEmpty>Không tìm thấy người dùng.</CommandEmpty>
            <CommandGroup>
              {isLoading ? (
                <CommandItem disabled>Đang tải...</CommandItem>
              ) : (
                users.map(user => (
                  <CommandItem
                    key={user.id}
                    value={`${user.displayName || ''} ${user.email}`}
                    onSelect={() => handleSelect(user.id)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedUserIds.includes(user.id) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex items-center justify-between w-full">
                        <span>{user.displayName || user.email}</span>
                        <Badge variant="outline" className="ml-2 capitalize">{user.role}</Badge>
                    </div>
                  </CommandItem>
                ))
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
