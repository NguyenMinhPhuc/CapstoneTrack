
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
import type { DefenseRegistration } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from './ui/calendar';

const formSchema = z.object({
  graduationExemptionDecisionNumber: z.string().min(1, { message: 'Số quyết định là bắt buộc.' }),
  graduationExemptionDecisionDate: z.date({ required_error: 'Ngày quyết định là bắt buộc.' }),
  graduationExemptionProofLink: z.string().url({ message: 'Vui lòng nhập URL hợp lệ.' }).optional().or(z.literal('')),
});

interface SpecialExemptionFormProps {
  registrations: DefenseRegistration[];
  onFinished: () => void;
}

export function SpecialExemptionForm({ registrations, onFinished }: SpecialExemptionFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      graduationExemptionDecisionNumber: '',
      graduationExemptionProofLink: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (registrations.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Chưa chọn sinh viên',
        description: 'Vui lòng chọn ít nhất một sinh viên.',
      });
      return;
    }

    const batch = writeBatch(firestore);
    
    const dataToUpdate = {
        ...values,
        graduationStatus: 'exempted' as const,
    };

    registrations.forEach(reg => {
      const registrationDocRef = doc(firestore, 'defenseRegistrations', reg.id);
      batch.update(registrationDocRef, dataToUpdate);
    });

    try {
        await batch.commit();
        toast({
            title: 'Thành công',
            description: `Đã cập nhật trạng thái đặc cách cho ${registrations.length} sinh viên.`,
        });
        onFinished();
    } catch(error) {
        console.error('Error updating special exemption:', error);
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
        <DialogTitle>Xét đặc cách tốt nghiệp</DialogTitle>
        <DialogDescription>
            Nhập thông tin quyết định đặc cách cho {registrations.length} sinh viên đã chọn.
        </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <div>
                    <FormLabel>Sinh viên được xét</FormLabel>
                    <ScrollArea className="h-24 mt-2 rounded-md border p-2">
                        <ul className="space-y-1 text-sm">
                            {registrations.map(reg => (
                                <li key={reg.id}>{reg.studentName} ({reg.studentId})</li>
                            ))}
                        </ul>
                    </ScrollArea>
                </div>
                <FormField
                control={form.control}
                name="graduationExemptionDecisionNumber"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Số quyết định</FormLabel>
                    <FormControl>
                        <Input placeholder="Ví dụ: 123/QĐ-ĐHLH" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                    control={form.control}
                    name="graduationExemptionDecisionDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Ngày quyết định</FormLabel>
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
                                    <span>Chọn một ngày</span>
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
                                disabled={(date) => date < new Date("1990-01-01")}
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
                name="graduationExemptionProofLink"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Link minh chứng (tùy chọn)</FormLabel>
                    <FormControl>
                        <Input placeholder="https://example.com/minh-chung.pdf" {...field} />
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
