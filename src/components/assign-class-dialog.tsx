
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
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import type { Student } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';

interface AssignClassDialogProps {
  studentIds: string[];
  allStudents: Student[];
  onFinished: () => void;
}

const formSchema = z.object({
  className: z.string().min(1, { message: 'Tên lớp là bắt buộc.' }),
});

export function AssignClassDialog({
  studentIds,
  allStudents,
  onFinished,
}: AssignClassDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const studentsToAssign = useMemo(() => {
    return allStudents.filter(student => 
      studentIds.includes(student.id) && !student.className
    );
  }, [studentIds, allStudents]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      className: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (studentsToAssign.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Không có sinh viên nào để xếp lớp',
        description: 'Tất cả sinh viên được chọn đã có lớp.',
      });
      onFinished();
      return;
    }

    const batch = writeBatch(firestore);
    studentsToAssign.forEach(student => {
      const studentRef = doc(firestore, 'students', student.id);
      batch.update(studentRef, { className: values.className });
    });

    try {
      await batch.commit();
      toast({
        title: 'Thành công',
        description: `Đã xếp ${studentsToAssign.length} sinh viên vào lớp ${values.className}.`,
      });
      onFinished();
    } catch (error: any) {
      console.error('Error assigning class:', error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: `Không thể xếp lớp: ${error.message}`,
      });
    }
  }

  return (
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Xếp lớp cho sinh viên</DialogTitle>
          <DialogDescription>
            Nhập tên lớp để xếp cho {studentsToAssign.length} sinh viên chưa có lớp.
          </DialogDescription>
        </DialogHeader>
        
        {studentsToAssign.length > 0 ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="className"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên lớp mới</FormLabel>
                    <FormControl>
                      <Input placeholder="Ví dụ: 22SE111" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div>
                <FormLabel>Sinh viên sẽ được xếp lớp</FormLabel>
                <ScrollArea className="h-40 mt-2 rounded-md border p-2">
                    <ul className="space-y-1 text-sm">
                        {studentsToAssign.map(student => (
                            <li key={student.id}>{student.firstName} {student.lastName} ({student.studentId})</li>
                        ))}
                    </ul>
                </ScrollArea>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onFinished}>Hủy</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Đang lưu...' : 'Xếp lớp'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
                Tất cả {studentIds.length} sinh viên bạn chọn đã có lớp. Vui lòng bỏ chọn những sinh viên đã có lớp để tiếp tục.
            </p>
             <DialogFooter className="mt-4">
                <Button type="button" onClick={onFinished}>Đóng</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
  );
}
