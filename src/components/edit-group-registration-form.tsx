
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import type { DefenseRegistration, Supervisor } from '@/lib/types';
import { SupervisorCombobox } from './supervisor-combobox';
import { ScrollArea } from './ui/scroll-area';
import { useState } from 'react';

const NO_SUPERVISOR_VALUE = "__NONE__";

const formSchema = z.object({
  projectTitle: z.string().optional(),
  supervisorId: z.string().optional(),
});

interface EditGroupRegistrationFormProps {
  registrations: DefenseRegistration[];
  onFinished: () => void;
}

export function EditGroupRegistrationForm({ registrations, onFinished }: EditGroupRegistrationFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [selectedSupervisor, setSelectedSupervisor] = useState<Supervisor | null>(null);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectTitle: registrations[0]?.projectTitle || '',
      supervisorId: registrations[0]?.supervisorId || '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (registrations.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Chưa chọn sinh viên',
        description: 'Vui lòng chọn ít nhất một sinh viên để cập nhật.',
      });
      return;
    }

    const batch = writeBatch(firestore);
    const supervisorIdValue = values.supervisorId === NO_SUPERVISOR_VALUE ? null : (values.supervisorId || null);
    const supervisorNameValue = selectedSupervisor ? `${selectedSupervisor.firstName} ${selectedSupervisor.lastName}` : (supervisorIdValue === null ? '' : registrations[0]?.supervisorName);


    const dataToUpdate = {
        projectTitle: values.projectTitle,
        supervisorId: supervisorIdValue,
        supervisorName: supervisorNameValue,
    };

    registrations.forEach(reg => {
      const registrationDocRef = doc(firestore, 'defenseRegistrations', reg.id);
      batch.update(registrationDocRef, dataToUpdate);
    });

    try {
        await batch.commit();
        toast({
            title: 'Thành công',
            description: `Đã cập nhật thông tin cho ${registrations.length} sinh viên.`,
        });
        onFinished();
    } catch(error) {
        console.error('Error updating group registration:', error);
        const contextualError = new FirestorePermissionError({
          path: 'batch update on defenseRegistrations',
          operation: 'update',
          requestResourceData: dataToUpdate,
        });
        errorEmitter.emit('permission-error', contextualError);
    }
  }

  return (
    <DialogContent className="sm:max-w-md">
        <DialogHeader>
        <DialogTitle>Cập nhật đề tài nhóm</DialogTitle>
        <DialogDescription>
            Cập nhật tên đề tài và GVHD cho {registrations.length} sinh viên đã chọn.
        </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <div>
                    <FormLabel>Sinh viên trong nhóm</FormLabel>
                    <ScrollArea className="h-20 mt-2 rounded-md border p-2">
                        <ul className="space-y-1 text-sm">
                            {registrations.map(reg => (
                                <li key={reg.id}>{reg.studentName} ({reg.studentId})</li>
                            ))}
                        </ul>
                    </ScrollArea>
                </div>
                <FormField
                control={form.control}
                name="projectTitle"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Tên đề tài</FormLabel>
                    <FormControl>
                        <Input placeholder="Ví dụ: Xây dựng hệ thống quản lý..." {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="supervisorId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Giáo viên hướng dẫn</FormLabel>
                    <FormControl>
                        <SupervisorCombobox
                            value={field.value || null}
                            onChange={(supervisorId) => field.onChange(supervisorId || '')}
                            onSupervisorSelect={setSelectedSupervisor}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <DialogFooter>
                    <Button type="button" variant="outline" onClick={onFinished}>Hủy</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    </DialogContent>
  );
}
