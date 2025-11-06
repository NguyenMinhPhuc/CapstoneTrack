

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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import type { DefenseRegistration } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

const formSchema = z.object({
  statusNote: z.string().optional(),
  reportType: z.enum(['graduation', 'internship', 'both'], {
    required_error: 'Vui lòng chọn loại báo cáo để cập nhật.'
  }),
});

interface WithdrawRegistrationFormProps {
  registrations: DefenseRegistration[];
  onFinished: () => void;
}

export function WithdrawRegistrationForm({ registrations, onFinished }: WithdrawRegistrationFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      statusNote: '',
      reportType: 'graduation',
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
    
    let dataToUpdate: any = {};
    if (values.reportType === 'graduation' || values.reportType === 'both') {
      dataToUpdate.graduationStatus = 'not_yet_reporting' as const;
      dataToUpdate.graduationStatusNote = values.statusNote || '';
    }
    if (values.reportType === 'internship' || values.reportType === 'both') {
      dataToUpdate.internshipStatus = 'not_yet_reporting' as const;
      dataToUpdate.internshipStatusNote = values.statusNote || '';
    }


    registrations.forEach(reg => {
      const registrationDocRef = doc(firestore, 'defenseRegistrations', reg.id);
      batch.update(registrationDocRef, dataToUpdate);
    });

    try {
        await batch.commit();
        toast({
            title: 'Thành công',
            description: `Đã cập nhật trạng thái "Chưa báo cáo" cho ${registrations.length} sinh viên.`,
        });
        onFinished();
    } catch(error) {
        console.error('Error updating registration status:', error);
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
        <DialogTitle>Cập nhật trạng thái "Chưa báo cáo"</DialogTitle>
        <DialogDescription>
            Nhập ghi chú cho {registrations.length} sinh viên đã chọn.
        </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <div>
                    <FormLabel>Sinh viên được cập nhật</FormLabel>
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
                  name="reportType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Áp dụng cho</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="graduation" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Chỉ Tốt nghiệp
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="internship" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Chỉ Thực tập
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                control={form.control}
                name="statusNote"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Ghi chú (tùy chọn)</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Nhập lý do hoặc ghi chú..." {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <DialogFooter>
                    <Button type="button" variant="outline" onClick={onFinished}>Hủy</Button>
                    <Button type="submit" variant="destructive" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? "Đang lưu..." : "Xác nhận Chưa báo cáo"}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    </DialogContent>
  );
}
