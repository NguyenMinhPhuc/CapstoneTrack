
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
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import type { Student } from '@/lib/types';
import { useEffect, useState } from 'react';

const formSchema = z.object({
  studentDocId: z.string({ required_error: 'Vui lòng chọn một sinh viên.' }),
  projectTitle: z.string().optional(),
  supervisorName: z.string().optional(),
});

interface AddStudentRegistrationFormProps {
  sessionId: string;
  onFinished: () => void;
}

export function AddStudentRegistrationForm({ sessionId, onFinished }: AddStudentRegistrationFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const studentsCollectionRef = collection(firestore, 'students');
        const querySnapshot = await getDocs(studentsCollectionRef);
        const studentList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
        setStudents(studentList);
      } catch (error) {
        console.error("Error fetching students:", error);
        toast({
          variant: 'destructive',
          title: 'Lỗi',
          description: 'Không thể tải danh sách sinh viên.',
        });
      } finally {
        setIsLoadingStudents(false);
      }
    };
    fetchStudents();
  }, [firestore, toast]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectTitle: '',
      supervisorName: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const registrationsCollectionRef = collection(firestore, 'defenseRegistrations');
      
    const selectedStudent = students.find(s => s.id === values.studentDocId);
    if (!selectedStudent) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không tìm thấy thông tin sinh viên đã chọn.',
      });
      return;
    }
    
    const studentName = `${selectedStudent.firstName} ${selectedStudent.lastName}`;
    const newRegistrationData = {
      sessionId: sessionId,
      studentDocId: selectedStudent.id,
      studentId: selectedStudent.studentId, // Correctly assign the student ID number
      studentName,
      projectTitle: values.projectTitle,
      supervisorName: values.supervisorName,
      registrationDate: serverTimestamp(),
    };

    addDoc(registrationsCollectionRef, newRegistrationData)
      .then(() => {
        toast({
          title: 'Thành công',
          description: `Đã thêm sinh viên ${studentName} vào đợt báo cáo.`,
        });
        onFinished();
      })
      .catch((error) => {
        const contextualError = new FirestorePermissionError({
          path: registrationsCollectionRef.path,
          operation: 'create',
          requestResourceData: newRegistrationData,
        });
        errorEmitter.emit('permission-error', contextualError);
      });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField
          control={form.control}
          name="studentDocId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sinh viên</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingStudents}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingStudents ? "Đang tải sinh viên..." : "Chọn một sinh viên"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {students.map(student => (
                    <SelectItem key={student.id} value={student.id}>
                      {`${student.firstName} ${student.lastName} (${student.studentId})`}
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
          name="projectTitle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tên đề tài (tùy chọn)</FormLabel>
              <FormControl>
                <Input placeholder="Ví dụ: Xây dựng hệ thống quản lý..." {...field} />
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
              <FormLabel>Tên giáo viên hướng dẫn (tùy chọn)</FormLabel>
              <FormControl>
                <Input placeholder="Ví dụ: Nguyễn Văn B" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Đang thêm..." : "Thêm sinh viên"}
        </Button>
      </form>
    </Form>
  );
}
