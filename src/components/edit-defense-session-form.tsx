
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
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, Timestamp, collection } from 'firebase/firestore';
import { CalendarIcon, GraduationCap, Briefcase, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { GraduationDefenseSession, Rubric } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';

const NO_RUBRIC_VALUE = "__NONE__";

const formSchema = z.object({
  name: z.string().min(1, { message: 'Tên đợt là bắt buộc.' }),
  startDate: z.date({ required_error: 'Ngày bắt đầu là bắt buộc.' }),
  registrationDeadline: z.date({ required_error: 'Ngày hết hạn đăng ký là bắt buộc.' }),
  expectedReportDate: z.date({ required_error: 'Ngày báo cáo dự kiến là bắt buộc.' }),
  zaloGroupLink: z.string().url({ message: 'Vui lòng nhập một URL hợp lệ.' }).optional().or(z.literal('')),
  description: z.string().optional(),
  councilGraduationRubricId: z.string().optional(),
  councilInternshipRubricId: z.string().optional(),
  supervisorGraduationRubricId: z.string().optional(),
  companyInternshipRubricId: z.string().optional(),
});

interface EditDefenseSessionFormProps {
  session: GraduationDefenseSession;
  onFinished: () => void;
}

export function EditDefenseSessionForm({ session, onFinished }: EditDefenseSessionFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const rubricsCollectionRef = useMemoFirebase(() => collection(firestore, 'rubrics'), [firestore]);
  const { data: rubrics, isLoading: isLoadingRubrics } = useCollection<Rubric>(rubricsCollectionRef);

  const toDate = (timestamp: any): Date | undefined => {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }
    if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
    }
    return timestamp;
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: session.name || '',
      startDate: toDate(session.startDate),
      registrationDeadline: toDate(session.registrationDeadline),
      expectedReportDate: toDate(session.expectedReportDate),
      zaloGroupLink: session.zaloGroupLink || '',
      description: session.description || '',
      councilGraduationRubricId: session.councilGraduationRubricId || '',
      councilInternshipRubricId: session.councilInternshipRubricId || '',
      supervisorGraduationRubricId: session.supervisorGraduationRubricId || '',
      companyInternshipRubricId: session.companyInternshipRubricId || '',
    },
  });

  const cleanRubricId = (value: string | undefined) => value === NO_RUBRIC_VALUE ? '' : value;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const sessionDocRef = doc(firestore, 'graduationDefenseSessions', session.id);
    
    const dataToUpdate = {
        ...values,
        councilGraduationRubricId: cleanRubricId(values.councilGraduationRubricId),
        councilInternshipRubricId: cleanRubricId(values.councilInternshipRubricId),
        supervisorGraduationRubricId: cleanRubricId(values.supervisorGraduationRubricId),
        companyInternshipRubricId: cleanRubricId(values.companyInternshipRubricId),
    };
    
    try {
      await updateDoc(sessionDocRef, dataToUpdate);
      toast({
        title: 'Thành công',
        description: `Thông tin đợt báo cáo "${values.name}" đã được cập nhật.`,
      });
      onFinished();
    } catch (error: any) {
      console.error("Error updating defense session:", error);
      toast({
        variant: 'destructive',
        title: 'Ôi! Đã xảy ra lỗi.',
        description: error.message || 'Không thể cập nhật đợt báo cáo.',
      });
    }
  }
  
  const RubricSelector = ({ name, label, icon }: { name: any, label: string, icon: React.ReactNode }) => (
     <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
            <FormItem>
            <FormLabel className="flex items-center gap-2">{icon}{label}</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || NO_RUBRIC_VALUE} disabled={isLoadingRubrics}>
                <FormControl>
                <SelectTrigger>
                    <SelectValue placeholder={isLoadingRubrics ? "Đang tải..." : "Chọn một rubric"} />
                </SelectTrigger>
                </FormControl>
                <SelectContent>
                <SelectItem value={NO_RUBRIC_VALUE}>Không sử dụng Rubric</SelectItem>
                {rubrics?.map(rubric => (
                    <SelectItem key={rubric.id} value={rubric.id}>
                    {rubric.name}
                    </SelectItem>
                ))}
                </SelectContent>
            </Select>
            <FormMessage />
            </FormItem>
        )}
        />
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tên đợt</FormLabel>
              <FormControl>
                <Input placeholder="Ví dụ: Đợt 1 - Học kỳ 2, 2023-2024" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                name="registrationDeadline"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Hạn đăng ký</FormLabel>
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
        </div>
        <FormField
          control={form.control}
          name="expectedReportDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Ngày báo cáo dự kiến</FormLabel>
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
        
        <Separator />
        <p className="text-sm font-medium">Gán Rubric cho đợt báo cáo</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <RubricSelector name="councilGraduationRubricId" label="Hội đồng chấm Tốt nghiệp" icon={<GraduationCap className="h-4 w-4" />} />
             <RubricSelector name="councilInternshipRubricId" label="Hội đồng chấm Thực tập" icon={<Briefcase className="h-4 w-4" />} />
             <RubricSelector name="supervisorGraduationRubricId" label="GVHD chấm Tốt nghiệp" icon={<GraduationCap className="h-4 w-4" />} />
             <RubricSelector name="companyInternshipRubricId" label="Đơn vị chấm Thực tập" icon={<UserCheck className="h-4 w-4" />} />
        </div>
        
        <Separator />

        <FormField
          control={form.control}
          name="zaloGroupLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Link nhóm Zalo (tùy chọn)</FormLabel>
              <FormControl>
                <Input placeholder="https://zalo.me/g/..." {...field} />
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
                <Textarea
                  placeholder="Nhập mô tả ngắn về đợt báo cáo này..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </form>
    </Form>
  );
}
