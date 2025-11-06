
'use client';

import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { ScrollArea } from './ui/scroll-area';
import type { Student } from '@/lib/types';


interface AssignMajorDialogProps {
  studentIds: string[];
  allStudents: Student[];
  onFinished: () => void;
}

const majors = [
    "Công nghệ thông tin",
    "Trí tuệ nhân tạo",
    "Thương mại điện tử",
    "Truyền thông đa phương tiện",
    "Đồ họa ứng dụng"
];

const formSchema = z.object({
  major: z.string({ required_error: 'Vui lòng chọn một chuyên ngành.' }),
});

export function AssignMajorDialog({
  studentIds,
  allStudents,
  onFinished,
}: AssignMajorDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const studentsToAssign = allStudents.filter(student => studentIds.includes(student.id));

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (studentsToAssign.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Không có sinh viên nào được chọn',
      });
      onFinished();
      return;
    }

    const batch = writeBatch(firestore);
    studentsToAssign.forEach(student => {
      const studentRef = doc(firestore, 'students', student.id);
      batch.update(studentRef, { major: values.major });
    });

    try {
      await batch.commit();
      toast({
        title: 'Thành công',
        description: `Đã gán chuyên ngành "${values.major}" cho ${studentsToAssign.length} sinh viên.`,
      });
      onFinished();
    } catch (error: any) {
      console.error('Error assigning major:', error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: `Không thể gán chuyên ngành: ${error.message}`,
      });
    }
  }

  return (
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gán chuyên ngành</DialogTitle>
          <DialogDescription>
            Chọn một chuyên ngành để gán cho {studentsToAssign.length} sinh viên đã chọn.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
               <FormField
                  control={form.control}
                  name="major"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chuyên ngành</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn một chuyên ngành..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {majors.map(major => (
                            <SelectItem key={major} value={major}>{major}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              
              <div>
                <FormLabel>Sinh viên sẽ được gán</FormLabel>
                <ScrollArea className="h-32 mt-2 rounded-md border p-2">
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
                  {form.formState.isSubmitting ? 'Đang lưu...' : 'Gán chuyên ngành'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
      </DialogContent>
  );
}
