

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
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
import { useFirestore, errorEmitter, FirestorePermissionError, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import type { Student, InternshipCompany } from '@/lib/types';
import type { User } from 'firebase/auth';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon, User as UserIcon, Mail, Phone, Building } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from './ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';

const formSchema = z.object({
  companyId: z.string().min(1, { message: 'Vui lòng chọn một phòng ban.' }),
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
  const [selectedDepartment, setSelectedDepartment] = useState<InternshipCompany | null>(null);

  const lhuDepartmentsQuery = useMemoFirebase(
    () => query(collection(firestore, 'internshipCompanies'), where('isLHU', '==', true)),
    [firestore]
  );
  const { data: lhuDepartments, isLoading: isLoadingDepartments } = useCollection<InternshipCompany>(lhuDepartmentsQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supervisorName: '',
      proofLink: '',
    },
  });

  const companyId = useWatch({ control: form.control, name: 'companyId' });

  useEffect(() => {
    if (companyId && lhuDepartments) {
      const department = lhuDepartments.find(d => d.id === companyId);
      setSelectedDepartment(department || null);
    } else {
      setSelectedDepartment(null);
    }
  }, [companyId, lhuDepartments]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const department = lhuDepartments?.find(d => d.id === values.companyId);
    if (!department) {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: 'Không tìm thấy thông tin phòng ban đã chọn.',
      });
      return;
    }

    const newRecord = {
      studentId: user.uid,
      studentName: `${student.firstName} ${student.lastName}`,
      studentIdentifier: student.studentId,
      companyName: department.name,
      companyAddress: department.address || '',
      supervisorName: values.supervisorName,
      startDate: values.startDate,
      endDate: values.endDate,
      proofLink: values.proofLink,
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
          name="companyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Chọn Phòng ban</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingDepartments}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingDepartments ? "Đang tải..." : "Chọn một phòng ban..."} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {lhuDepartments?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {selectedDepartment && (
          <Card>
            <CardHeader>
              <CardTitle>{selectedDepartment.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Building className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <p>{selectedDepartment.address || 'Chưa có thông tin địa chỉ'}</p>
              </div>
              <Separator/>
              <p className="text-muted-foreground">{selectedDepartment.description || 'Không có mô tả.'}</p>
            </CardContent>
          </Card>
        )}
        <FormField
          control={form.control}
          name="supervisorName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Người hướng dẫn tại phòng ban</FormLabel>
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
