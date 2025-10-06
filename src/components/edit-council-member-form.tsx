
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { DefenseCouncilMember } from '@/lib/types';
import { Input } from './ui/input';

const formSchema = z.object({
  role: z.enum(['President', 'Vice President', 'Secretary', 'Member'], {
    required_error: 'Vui lòng chọn vai trò.',
  }),
});

interface EditCouncilMemberFormProps {
  member: DefenseCouncilMember;
  sessionId: string;
  onFinished: () => void;
}

export function EditCouncilMemberForm({
  member,
  sessionId,
  onFinished,
}: EditCouncilMemberFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: member.role,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const memberDocRef = doc(firestore, `graduationDefenseSessions/${sessionId}/council`, member.id);
    
    const updateData = {
        role: values.role,
    };

    updateDoc(memberDocRef, updateData)
        .then(() => {
            toast({
                title: 'Thành công',
                description: 'Vai trò của thành viên đã được cập nhật.',
            });
            onFinished();
        })
        .catch(error => {
            const contextualError = new FirestorePermissionError({
              path: memberDocRef.path,
              operation: 'update',
              requestResourceData: updateData
            });
            errorEmitter.emit('permission-error', contextualError);
        });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormItem>
            <FormLabel>Tên thành viên</FormLabel>
            <Input value={member.name} disabled />
        </FormItem>
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vai trò</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn vai trò trong hội đồng" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="President">Chủ tịch</SelectItem>
                  <SelectItem value="Vice President">Phó Chủ tịch</SelectItem>
                  <SelectItem value="Secretary">Thư ký</SelectItem>
                  <SelectItem value="Member">Thành viên</SelectItem>
                </SelectContent>
              </Select>
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
