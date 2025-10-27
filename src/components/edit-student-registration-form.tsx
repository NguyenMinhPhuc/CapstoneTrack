
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
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { DefenseRegistration, Supervisor } from '@/lib/types';
import { SupervisorCombobox } from './supervisor-combobox';
import { useState } from 'react';

const NO_SUPERVISOR_VALUE = "__NONE__";

const formSchema = z.object({
  projectTitle: z.string().optional(),
  supervisorId: z.string().optional(),
});

interface EditStudentRegistrationFormProps {
  registration: DefenseRegistration;
  onFinished: () => void;
}

export function EditStudentRegistrationForm({ registration, onFinished }: EditStudentRegistrationFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [selectedSupervisor, setSelectedSupervisor] = useState<Supervisor | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectTitle: registration.projectTitle || '',
      supervisorId: registration.supervisorId || '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const registrationDocRef = doc(firestore, `defenseRegistrations`, registration.id);
    
    const supervisorIdValue = values.supervisorId === NO_SUPERVISOR_VALUE ? null : (values.supervisorId || null);
    const supervisorNameValue = selectedSupervisor ? `${selectedSupervisor.firstName} ${selectedSupervisor.lastName}` : (supervisorIdValue === null ? '' : registration.supervisorName);


    const updateData = {
      projectTitle: values.projectTitle,
      supervisorId: supervisorIdValue,
      supervisorName: supervisorNameValue,
    };

    updateDoc(registrationDocRef, updateData)
      .then(() => {
        toast({
          title: 'Thành công',
          description: `Đã cập nhật thông tin đăng ký cho sinh viên ${registration.studentName}.`,
        });
        onFinished();
      })
      .catch((error) => {
        const contextualError = new FirestorePermissionError({
          path: registrationDocRef.path,
          operation: 'update',
          requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', contextualError);
      });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormItem>
            <FormLabel>Sinh viên</FormLabel>
            <Input value={registration.studentName} disabled />
        </FormItem>

        <FormField
          control={form.control}
          name="projectTitle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tên đề tài (tùy chọn)</FormLabel>
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
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </form>
    </Form>
  );
}
