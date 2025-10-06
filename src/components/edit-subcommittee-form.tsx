
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
import type { DefenseSubCommittee } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(1, { message: 'Tên tiểu ban là bắt buộc.' }),
});

interface EditSubCommitteeFormProps {
  subcommittee: DefenseSubCommittee;
  sessionId: string;
  onFinished: () => void;
}

export function EditSubCommitteeForm({ subcommittee, sessionId, onFinished }: EditSubCommitteeFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: subcommittee.name,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const subcommitteeDocRef = doc(firestore, `graduationDefenseSessions/${sessionId}/subCommittees`, subcommittee.id);
    
    const updateData = {
        name: values.name,
    };

    updateDoc(subcommitteeDocRef, updateData)
        .then(() => {
            toast({
                title: 'Thành công',
                description: 'Tên tiểu ban đã được cập nhật.',
            });
            onFinished();
        })
        .catch(error => {
            const contextualError = new FirestorePermissionError({
              path: subcommitteeDocRef.path,
              operation: 'update',
              requestResourceData: updateData
            });
            errorEmitter.emit('permission-error', contextualError);
        });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tên tiểu ban</FormLabel>
              <FormControl>
                <Input placeholder="Ví dụ: Tiểu ban 1 - CNTT" {...field} />
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
