

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
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Supervisor, DefenseCouncilMember } from '@/lib/types';
import { useMemo } from 'react';

const formSchema = z.object({
  supervisorId: z.string({ required_error: 'Vui lòng chọn một giáo viên.' }),
  role: z.enum(['President', 'Vice President', 'Secretary', 'Member'], {
    required_error: 'Vui lòng chọn vai trò.',
  }),
});

interface AddCouncilMemberFormProps {
  sessionId: string;
  allSupervisors: Supervisor[];
  existingMembers: DefenseCouncilMember[];
  onFinished: () => void;
}

export function AddCouncilMemberForm({
  sessionId,
  allSupervisors,
  existingMembers,
  onFinished,
}: AddCouncilMemberFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const availableSupervisors = useMemo(() => {
    const existingSupervisorIds = new Set(existingMembers.map(m => m.supervisorId));
    return allSupervisors.filter(s => !existingSupervisorIds.has(s.id));
  }, [allSupervisors, existingMembers]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const councilCollectionRef = collection(firestore, `graduationDefenseSessions/${sessionId}/council`);
    
    const selectedSupervisor = allSupervisors.find(s => s.id === values.supervisorId);
    if (!selectedSupervisor) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không tìm thấy thông tin giáo viên đã chọn.',
      });
      return;
    }

    const newMemberData = {
      sessionId: sessionId,
      supervisorId: selectedSupervisor.id,
      name: `${selectedSupervisor.firstName} ${selectedSupervisor.lastName}`,
      role: values.role,
      createdAt: serverTimestamp(),
    };
    
    try {
        await addDoc(councilCollectionRef, newMemberData);
        toast({
            title: 'Thành công',
            description: 'Đã thêm thành viên mới vào hội đồng.',
        });
        onFinished();
    } catch (error: any) {
        console.error("Error adding council member:", error);
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: error.message,
        });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField
          control={form.control}
          name="supervisorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Giáo viên</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn một giáo viên" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableSupervisors.map(supervisor => (
                    <SelectItem key={supervisor.id} value={supervisor.id}>
                      {`${supervisor.firstName} ${supervisor.lastName}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
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
            {form.formState.isSubmitting ? "Đang thêm..." : "Thêm vào hội đồng"}
        </Button>
      </form>
    </Form>
  );
}
