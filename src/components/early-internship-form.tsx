
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
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Student } from '@/lib/types';
import type { User } from 'firebase/auth';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from './ui/calendar';

const formSchema = z.object({
  companyName: z.string().min(1, { message: 'Tên công ty/phòng ban là bắt buộc.' }),
  companyAddress: z.string().optional(),
  supervisorName: z.string().optional(),
  startDate: z.date({ required_error: 'Ngày bắt đầu là bắt buộc.' }),
  endDate: z.date().optional(),
  proofLink: z.string().url({ message: 'URL không hợp lệ' }).optional().or(z.literal('')),
});

interface EarlyInternshipFormProps {
  user: User;
  student: Student;
  onFinished: () => void;
}

export function EarlyInternshipForm({ user, student, onFinished }: EarlyInternshipFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: '',
      companyAddress: '',
      supervisorName: '',
      proofLink: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const newRecord = {
      ...values,
      studentId: user.uid,
      studentName: `${student.firstName} ${student.lastName}`,
      studentIdentifier: student.studentId,
      status: 'ongoing' as const,
      createdAt: serverTimestamp(),
    };
    
    addDoc(collection(firestore, 'earlyInternships'), newRecord)
      .then(() => {
        toast({
          title: 'Thành công',
          description: 'Đã tạo đơn đăng ký thực tập sớm.',
        });
        onFinished();
      })
      .catch((error) => {
        const contextualError = new FirestorePermissionError({
          path: 'earlyInternships',
          operation: 'create',
          requestResourceData: newRecord,
        });
        errorEmitter.emit('permission-error', contextualError);
      });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tên Công ty / Phòng ban</FormLabel>
              <FormControl>
                <Input placeholder="Ví dụ: Trung tâm Thông tin và Quản trị mạng" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="companyAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Địa chỉ</FormLabel>
              <FormControl>
                <Input placeholder="Ví dụ: Đại học Lạc Hồng" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="supervisorName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Người hướng dẫn tại đơn vị</FormLabel>
              <FormControl>
                <Input placeholder="Tên người hướng dẫn" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                <FormLabel>Ngày bắt đầu</FormLabel>
                <Popover>
                    <PopoverTrigger asChild>
                    <FormControl>
                        <Button
                        variant={"outline"}
                        className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                        )}
                        >
                        {field.value ? (
                            format(field.value, "PPP")
                        ) : (
                            <span>Chọn ngày</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                <FormLabel>Ngày kết thúc (dự kiến)</FormLabel>
                <Popover>
                    <PopoverTrigger asChild>
                    <FormControl>
                        <Button
                        variant={"outline"}
                        className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                        )}
                        >
                        {field.value ? (
                            format(field.value, "PPP")
                        ) : (
                            <span>Chọn ngày</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                    />
                    </PopoverContent>
                </Popover>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
          control={form.control}
          name="proofLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Link minh chứng (nếu có)</FormLabel>
              <FormControl>
                <Input placeholder="Link đến giấy tiếp nhận hoặc giấy tờ liên quan" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Đang gửi...' : 'Gửi Đơn đăng ký'}
        </Button>
      </form>
    </Form>
  );
}
