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
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import type { Student, Supervisor, DefenseSession, DefenseRegistration } from '@/lib/types';
import { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';


const formSchema = z.object({
  studentDocId: z.string({ required_error: 'Vui lòng chọn một sinh viên.' }),
});

interface AddStudentRegistrationFormProps {
  sessionId: string;
  sessionType: DefenseSession['sessionType'];
  onFinished: () => void;
}

export function AddStudentRegistrationForm({ sessionId, sessionType, onFinished }: AddStudentRegistrationFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [comboboxOpen, setComboboxOpen] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        // Fetch existing registrations for this session to filter out already registered students
        const registrationsQuery = query(collection(firestore, 'defenseRegistrations'), where('sessionId', '==', sessionId));
        const registrationsSnapshot = await getDocs(registrationsQuery);
        const registeredStudentIds = new Set(registrationsSnapshot.docs.map(doc => doc.data().studentDocId));

        const studentsCollectionRef = collection(firestore, 'students');
        const querySnapshot = await getDocs(studentsCollectionRef);
        const studentList = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Student))
            .filter(student => !registeredStudentIds.has(student.id)); // Exclude already registered students

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
  }, [firestore, toast, sessionId]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
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

    if (!selectedStudent.studentId) {
        toast({
            variant: 'destructive',
            title: 'Thiếu thông tin',
            description: `Sinh viên ${selectedStudent.firstName} ${selectedStudent.lastName} chưa có Mã số sinh viên. Vui lòng cập nhật hồ sơ sinh viên trước.`,
        });
        return;
    }
    
    const newRegistrationData: Partial<DefenseRegistration> = {
      sessionId: sessionId,
      studentDocId: selectedStudent.id,
      studentId: selectedStudent.studentId,
      studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
      registrationDate: serverTimestamp(),
    };
    
    if (sessionType === 'graduation') {
        newRegistrationData.graduationStatus = 'reporting';
        newRegistrationData.internshipStatus = 'not_reporting';
    } else if (sessionType === 'internship') {
        newRegistrationData.graduationStatus = 'not_reporting';
        newRegistrationData.internshipStatus = 'reporting';
    } else { // combined
        newRegistrationData.graduationStatus = 'reporting';
        newRegistrationData.internshipStatus = 'reporting';
    }


    try {
        await addDoc(registrationsCollectionRef, newRegistrationData);
        toast({
          title: 'Thành công',
          description: `Đã thêm sinh viên ${newRegistrationData.studentName} vào đợt báo cáo.`,
        });
        onFinished();
      } catch (error: any) {
        console.error("Error creating registration:", error);
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
          name="studentDocId"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Sinh viên</FormLabel>
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {isLoadingStudents
                        ? "Đang tải..."
                        : field.value
                        ? students.find(
                            (student) => student.id === field.value
                          )?.studentId
                        : "Tìm sinh viên theo MSSV hoặc tên"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Tìm sinh viên..." />
                    <CommandList>
                      <CommandEmpty>Không tìm thấy sinh viên.</CommandEmpty>
                      <CommandGroup>
                        {students.map((student) => (
                          <CommandItem
                            value={`${student.studentId} ${student.firstName} ${student.lastName}`}
                            key={student.id}
                            onSelect={() => {
                              form.setValue("studentDocId", student.id);
                              setComboboxOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                student.id === field.value
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div>
                                <p className="font-medium">{student.firstName} {student.lastName}</p>
                                <p className="text-sm text-muted-foreground">{student.studentId}</p>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
