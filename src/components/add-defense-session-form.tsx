

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
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, errorEmitter, FirestorePermissionError, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { CalendarIcon, GraduationCap, Briefcase, UserCheck, Building, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addMonths, startOfMonth, getDay, addDays } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { Rubric, InternshipCompany, DefenseSession } from '@/lib/types';
import { Separator } from './ui/separator';
import { Slider } from './ui/slider';
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import * as React from 'react';
import { Badge } from './ui/badge';

const NO_RUBRIC_VALUE = "__NONE__";

const formSchema = z.object({
  name: z.string().min(1, { message: 'Tên đợt là bắt buộc.' }),
  sessionType: z.enum(['graduation', 'internship', 'combined'], {
    required_error: 'Vui lòng chọn loại đợt báo cáo.',
  }),
  startDate: z.date({ required_error: 'Ngày bắt đầu là bắt buộc.' }),
  registrationDeadline: z.date({ required_error: 'Ngày hết hạn đăng ký là bắt buộc.' }),
  expectedReportDate: z.date({ required_error: 'Ngày báo cáo dự kiến là bắt buộc.' }),
  zaloGroupLink: z.string().url({ message: 'Vui lòng nhập một URL hợp lệ.' }).optional().or(z.literal('')),
  description: z.string().optional(),
  postDefenseSubmissionLink: z.string().url({ message: 'Vui lòng nhập một URL hợp lệ.' }).optional().or(z.literal('')),
  postDefenseSubmissionDescription: z.string().optional(),
  companyIds: z.array(z.string()).optional(),
  councilGraduationRubricId: z.string().optional(),
  councilInternshipRubricId: z.string().optional(),
  supervisorGraduationRubricId: z.string().optional(),
  companyInternshipRubricId: z.string().optional(),
  graduationCouncilWeight: z.number().min(0).max(100).optional(),
  internshipCouncilWeight: z.number().min(0).max(100).optional(),
});

interface AddDefenseSessionFormProps {
  onFinished: () => void;
  sessionToCopy?: DefenseSession | null;
}

export function AddDefenseSessionForm({ onFinished, sessionToCopy }: AddDefenseSessionFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const rubricsCollectionRef = useMemoFirebase(() => collection(firestore, 'rubrics'), [firestore]);
  const { data: rubrics, isLoading: isLoadingRubrics } = useCollection<Rubric>(rubricsCollectionRef);

  const companiesCollectionRef = useMemoFirebase(() => collection(firestore, 'internshipCompanies'), [firestore]);
  const { data: companies, isLoading: isLoadingCompanies } = useCollection<InternshipCompany>(companiesCollectionRef);
  
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
      name: sessionToCopy ? `${sessionToCopy.name} (Copy)` : '',
      sessionType: sessionToCopy?.sessionType || 'combined',
      description: sessionToCopy?.description || '',
      zaloGroupLink: sessionToCopy?.zaloGroupLink || '',
      postDefenseSubmissionLink: sessionToCopy?.postDefenseSubmissionLink || '',
      postDefenseSubmissionDescription: sessionToCopy?.postDefenseSubmissionDescription || '',
      companyIds: sessionToCopy?.companyIds || [],
      councilGraduationRubricId: sessionToCopy?.councilGraduationRubricId || '',
      councilInternshipRubricId: sessionToCopy?.councilInternshipRubricId || '',
      supervisorGraduationRubricId: sessionToCopy?.supervisorGraduationRubricId || '',
      companyInternshipRubricId: sessionToCopy?.companyInternshipRubricId || '',
      graduationCouncilWeight: sessionToCopy?.graduationCouncilWeight ?? 80,
      internshipCouncilWeight: sessionToCopy?.internshipCouncilWeight ?? 50,
      startDate: sessionToCopy ? undefined : new Date(),
      registrationDeadline: undefined,
      expectedReportDate: undefined,
    },
  });

  const sessionType = useWatch({
      control: form.control,
      name: 'sessionType'
  });
  
  const startDate = useWatch({
      control: form.control,
      name: 'startDate'
  });

  React.useEffect(() => {
    if (startDate) {
      // Logic: Saturday of the second week of the month, 3 months from the start date.
      // 1. Add 3 months to start date
      const futureMonth = addMonths(startDate, 3);
      // 2. Get the first day of that month
      const firstDayOfFutureMonth = startOfMonth(futureMonth);
      // 3. Find the day of the week for the 1st (0=Sun, 1=Mon, ..., 6=Sat)
      const firstDayOfWeek = getDay(firstDayOfFutureMonth);
      // 4. Calculate days to add to get to the first Saturday
      // (6 - firstDayOfWeek + 7) % 7 ensures we always move forward to the next Saturday
      const daysUntilFirstSaturday = (6 - firstDayOfWeek + 7) % 7;
      // 5. First Saturday is found. Add 7 more days to get to the second Saturday.
      const secondSaturday = addDays(firstDayOfFutureMonth, daysUntilFirstSaturday + 7);

      form.setValue('expectedReportDate', secondSaturday);
    }
  }, [startDate, form]);

  
  const cleanRubricId = (value: string | undefined) => value === NO_RUBRIC_VALUE ? '' : value;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const collectionRef = collection(firestore, 'graduationDefenseSessions');
    const newSessionData = {
      ...values,
      councilGraduationRubricId: cleanRubricId(values.councilGraduationRubricId),
      councilInternshipRubricId: cleanRubricId(values.councilInternshipRubricId),
      supervisorGraduationRubricId: cleanRubricId(values.supervisorGraduationRubricId),
      companyInternshipRubricId: cleanRubricId(values.companyInternshipRubricId),
      status: 'upcoming' as const, // Default status for a new session
      createdAt: serverTimestamp(),
    };
    
    addDoc(collectionRef, newSessionData)
      .then(() => {
        toast({
          title: 'Thành công',
          description: `Đợt báo cáo "${values.name}" đã được tạo.`,
        });
        onFinished();
      })
      .catch((error) => {
        const contextualError = new FirestorePermissionError({
          path: collectionRef.path,
          operation: 'create',
          requestResourceData: newSessionData,
        });
        errorEmitter.emit('permission-error', contextualError);
      });
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
  
  const selectedCompanyIds = useWatch({ control: form.control, name: 'companyIds' }) || [];

  return (
    <>
      <DialogHeader>
        <DialogTitle>{sessionToCopy ? 'Sao chép Đợt báo cáo' : 'Tạo Đợt báo cáo mới'}</DialogTitle>
        <DialogDescription>
            {sessionToCopy ? `Tạo một bản sao của "${sessionToCopy.name}". Vui lòng cập nhật lại thời gian.` : 'Điền thông tin chi tiết để tạo một đợt báo cáo mới.'}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <ScrollArea className="h-[65vh] pr-6">
            <div className="space-y-4 py-4">
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
                 <FormField
                  control={form.control}
                  name="sessionType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Loại đợt báo cáo</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex items-center space-x-4"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="graduation" /></FormControl>
                            <FormLabel className="font-normal">Chỉ Tốt nghiệp</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="internship" /></FormControl>
                            <FormLabel className="font-normal">Chỉ Thực tập</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="combined" /></FormControl>
                            <FormLabel className="font-normal">Kết hợp cả hai</FormLabel>
                          </FormItem>
                        </RadioGroup>
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
                  {(sessionType === 'graduation' || sessionType === 'combined') && (
                    <>
                      <RubricSelector name="councilGraduationRubricId" label="Hội đồng chấm Tốt nghiệp" icon={<GraduationCap className="h-4 w-4" />} />
                      <RubricSelector name="supervisorGraduationRubricId" label="GVHD chấm Tốt nghiệp" icon={<GraduationCap className="h-4 w-4" />} />
                    </>
                  )}
                  {(sessionType === 'internship' || sessionType === 'combined') && (
                    <>
                      <RubricSelector name="councilInternshipRubricId" label="Hội đồng chấm Thực tập" icon={<Briefcase className="h-4 w-4" />} />
                      <RubricSelector name="companyInternshipRubricId" label="Đơn vị chấm Thực tập" icon={<UserCheck className="h-4 w-4" />} />
                    </>
                  )}
                </div>
                
                {(sessionType === 'graduation' || sessionType === 'combined') && (
                  <>
                    <Separator />
                    <p className="text-sm font-medium">Tùy chỉnh Tỷ lệ điểm Tốt nghiệp</p>

                    <FormField
                      control={form.control}
                      name="graduationCouncilWeight"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Tỷ lệ điểm Hội đồng/GVHD</FormLabel>
                          <div className="flex items-center gap-4">
                              <span className="text-xs text-muted-foreground">HĐ: {field.value}%</span>
                              <Slider
                              value={[field.value ?? 80]}
                              onValueChange={(value) => field.onChange(value[0])}
                              max={100}
                              step={5}
                              />
                              <span className="text-xs text-muted-foreground">GVHD: {100 - (field.value ?? 80)}%</span>
                          </div>
                          <FormMessage />
                          </FormItem>
                      )}
                    />
                  </>
                )}
                
                 {(sessionType === 'internship' || sessionType === 'combined') && (
                    <>
                      {sessionType !== 'graduation' && <Separator />}
                      <p className="text-sm font-medium">Tùy chỉnh Tỷ lệ điểm Thực tập</p>
                      <FormField
                        control={form.control}
                        name="internshipCouncilWeight"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Tỷ lệ điểm Hội đồng/Đơn vị</FormLabel>
                            <div className="flex items-center gap-4">
                                <span className="text-xs text-muted-foreground">HĐ: {field.value}%</span>
                                <Slider
                                value={[field.value ?? 50]}
                                onValueChange={(value) => field.onChange(value[0])}
                                max={100}
                                step={5}
                                />
                                <span className="text-xs text-muted-foreground">ĐV: {100 - (field.value ?? 50)}%</span>
                            </div>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                         <Separator />
                        <FormField
                            control={form.control}
                            name="companyIds"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                        <Building className="h-4 w-4" />
                                        Doanh nghiệp tham gia
                                    </FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className="w-full justify-between h-auto min-h-10"
                                                >
                                                    <div className="flex flex-wrap gap-2">
                                                        {selectedCompanyIds.length > 0 ? (
                                                            companies
                                                                ?.filter(c => selectedCompanyIds.includes(c.id))
                                                                .map(c => <Badge key={c.id} variant="secondary">{c.name}</Badge>)
                                                        ) : (
                                                            <span className="font-normal text-muted-foreground">Chọn doanh nghiệp...</span>
                                                        )}
                                                    </div>
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                            <Command>
                                                <CommandInput placeholder="Tìm doanh nghiệp..." />
                                                <CommandList>
                                                    <CommandEmpty>Không tìm thấy doanh nghiệp.</CommandEmpty>
                                                    <CommandGroup>
                                                        {companies?.map(company => (
                                                            <CommandItem
                                                                key={company.id}
                                                                onSelect={() => {
                                                                    const currentIds = field.value || [];
                                                                    const newIds = currentIds.includes(company.id)
                                                                        ? currentIds.filter(id => id !== company.id)
                                                                        : [...currentIds, company.id];
                                                                    field.onChange(newIds);
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        field.value?.includes(company.id) ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                {company.name}
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
                    </>
                 )}


                <Separator />
                <p className="text-sm font-medium">Nộp báo cáo sau Hội đồng</p>
                <FormField
                control={form.control}
                name="postDefenseSubmissionLink"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Link nộp bài</FormLabel>
                    <FormControl>
                        <Input placeholder="https://forms.gle/..." {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="postDefenseSubmissionDescription"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Mô tả/Yêu cầu</FormLabel>
                    <FormControl>
                        <Textarea
                        placeholder="Nhập các yêu cầu khi nộp bài: thành phần, định dạng,..."
                        className="resize-y"
                        {...field}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />


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
            </div>
          </ScrollArea>
           <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={onFinished}>Hủy</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Đang tạo..." : "Tạo đợt báo cáo"}
              </Button>
           </DialogFooter>
        </form>
      </Form>
    </>
  );
}
