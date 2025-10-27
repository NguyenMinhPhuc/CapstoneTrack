

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
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Textarea } from './ui/textarea';

const formSchema = z.object({
  name: z.string().min(1, { message: 'Tên tiểu ban là bắt buộc.' }),
  description: z.string().optional(),
});

interface AddSubCommitteeFormProps {
  sessionId: string;
  onFinished: () => void;
}

export function AddSubCommitteeForm({ sessionId, onFinished }: AddSubCommitteeFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const subcommitteesCollectionRef = collection(firestore, `graduationDefenseSessions/${sessionId}/subCommittees`);
    
    const newSubcommitteeData = {
      sessionId: sessionId,
      name: values.name,
      description: values.description || '',
      members: [], // Initialize with an empty member list
      createdAt: serverTimestamp(),
    };
    
    try {
        await addDoc(subcommitteesCollectionRef, newSubcommitteeData);
        toast({
            title: 'Thành công',
            description: `Đã tạo tiểu ban mới: ${values.name}`,
        });
        onFinished();
    } catch (error: any) {
        console.error("Error creating subcommittee:", error);
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
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mô tả (tùy chọn)</FormLabel>
              <FormControl>
                <Textarea placeholder="Ghi chú thêm về phòng, thời gian..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Đang tạo..." : "Tạo tiểu ban"}
        </Button>
      </form>
    </Form>
  );
}
