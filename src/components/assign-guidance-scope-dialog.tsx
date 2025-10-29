
'use client';

import { useState, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import type { Supervisor } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { Checkbox } from './ui/checkbox';

interface AssignGuidanceScopeDialogProps {
  supervisorIds: string[];
  allSupervisors: Supervisor[];
  onFinished: () => void;
}

const formSchema = z.object({
  canGuideGraduation: z.boolean().default(false),
  canGuideInternship: z.boolean().default(false),
});

export function AssignGuidanceScopeDialog({
  supervisorIds,
  allSupervisors,
  onFinished,
}: AssignGuidanceScopeDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const supervisorsToAssign = useMemo(() => {
    return allSupervisors.filter(supervisor => 
      supervisorIds.includes(supervisor.id)
    );
  }, [supervisorIds, allSupervisors]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      canGuideGraduation: false,
      canGuideInternship: false,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (supervisorsToAssign.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Không có giáo viên nào được chọn',
      });
      onFinished();
      return;
    }

    const batch = writeBatch(firestore);
    const updateData = {
        canGuideGraduation: values.canGuideGraduation,
        canGuideInternship: values.canGuideInternship,
    };

    supervisorsToAssign.forEach(supervisor => {
      const supervisorRef = doc(firestore, 'supervisors', supervisor.id);
      batch.update(supervisorRef, updateData);
    });

    try {
      await batch.commit();
      toast({
        title: 'Thành công',
        description: `Đã gán phạm vi hướng dẫn cho ${supervisorsToAssign.length} giáo viên.`,
      });
      onFinished();
    } catch (error: any) {
      console.error('Error assigning guidance scope:', error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: `Không thể gán phạm vi: ${error.message}`,
      });
    }
  }

  return (
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gán phạm vi hướng dẫn</DialogTitle>
          <DialogDescription>
            Chọn phạm vi hướng dẫn sẽ được áp dụng cho {supervisorsToAssign.length} giáo viên đã chọn.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <FormLabel>Giáo viên sẽ được gán</FormLabel>
                <ScrollArea className="h-32 mt-2 rounded-md border p-2">
                    <ul className="space-y-1 text-sm">
                        {supervisorsToAssign.map(s => (
                            <li key={s.id}>{s.firstName} {s.lastName}</li>
                        ))}
                    </ul>
                </ScrollArea>
              </div>

               <div className="space-y-2">
                    <FormField
                        control={form.control}
                        name="canGuideGraduation"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                    <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel>
                                    Hướng dẫn Đồ án Tốt nghiệp
                                    </FormLabel>
                                </div>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="canGuideInternship"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                    <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel>
                                    Hướng dẫn Thực tập
                                    </FormLabel>
                                </div>
                            </FormItem>
                        )}
                    />
                </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onFinished}>Hủy</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
      </DialogContent>
  );
}
