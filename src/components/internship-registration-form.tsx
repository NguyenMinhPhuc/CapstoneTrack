
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
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { DefenseRegistration, InternshipCompany, InternshipRegistrationStatus, EarlyInternship, InternshipPosition } from '@/lib/types';
import { Separator } from './ui/separator';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Building, Mail, Phone, User, XCircle, Briefcase } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';


const formSchema = z.object({
  registrationType: z.enum(['from_list', 'self_arranged', 'early_internship']),
  
  // From list
  selectedCompanyId: z.string().optional(),
  internship_positionId: z.string().optional(),

  // Self-arranged
  internship_companyName: z.string().optional(),
  internship_companyAddress: z.string().optional(),
  internship_companySupervisorName: z.string().optional(),
  internship_companySupervisorPhone: z.string().optional(),
  
  // Documents
  internship_registrationFormLink: z.string().url({ message: 'Vui lòng nhập một URL hợp lệ.' }).optional().or(z.literal('')),
  internship_acceptanceLetterLink: z.string().url({ message: 'Vui lòng nhập một URL hợp lệ.' }).optional().or(z.literal('')),
  internship_commitmentFormLink: z.string().url({ message: 'Vui lòng nhập một URL hợp lệ.' }).optional().or(z.literal('')),
}).refine(data => {
    if (data.registrationType === 'from_list') {
        return !!data.selectedCompanyId;
    }
    if (data.registrationType === 'self_arranged') {
        return !!data.internship_companyName;
    }
    // early_internship is always valid if selected, as data is pre-filled
    if (data.registrationType === 'early_internship') {
        return true;
    }
    return false;
}, {
    message: 'Vui lòng chọn doanh nghiệp hoặc nhập tên doanh nghiệp.',
    path: ['selectedCompanyId'] // Apply error to one of the fields
});


interface InternshipRegistrationFormProps {
  registration: DefenseRegistration;
  sessionCompanies: InternshipCompany[];
  hasCompletedEarlyInternship: boolean;
  earlyInternshipData: EarlyInternship | null;
  onSuccess: () => void;
}

export function InternshipRegistrationForm({ registration, sessionCompanies, hasCompletedEarlyInternship, earlyInternshipData, onSuccess }: InternshipRegistrationFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [selectedCompany, setSelectedCompany] = useState<InternshipCompany | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<InternshipPosition | null>(null);

  const isApproved = registration.internshipRegistrationStatus === 'approved';
  const isRejected = registration.internshipRegistrationStatus === 'rejected';
  const isPending = registration.internshipRegistrationStatus === 'pending';
  
  // Only company details are locked after approval. Links are always editable.
  const areCompanyFieldsDisabled = isApproved || isPending;


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      registrationType: registration.internship_companyName ? (hasCompletedEarlyInternship && registration.internship_companyName === earlyInternshipData?.companyName ? 'early_internship' : 'self_arranged') : 'from_list',
      selectedCompanyId: '',
      internship_positionId: registration.internship_positionId || '',
      internship_companyName: registration.internship_companyName || '',
      internship_companyAddress: registration.internship_companyAddress || '',
      internship_companySupervisorName: registration.internship_companySupervisorName || '',
      internship_companySupervisorPhone: registration.internship_companySupervisorPhone || '',
      internship_registrationFormLink: registration.internship_registrationFormLink || '',
      internship_acceptanceLetterLink: registration.internship_acceptanceLetterLink || '',
      internship_commitmentFormLink: registration.internship_commitmentFormLink || '',
    },
  });

  const registrationType = useWatch({ control: form.control, name: 'registrationType' });
  const selectedCompanyId = useWatch({ control: form.control, name: 'selectedCompanyId' });
  const internship_positionId = useWatch({ control: form.control, name: 'internship_positionId' });


  useEffect(() => {
    if (registrationType === 'from_list' && selectedCompanyId) {
      const company = sessionCompanies.find(c => c.id === selectedCompanyId);
      setSelectedCompany(company || null);
       if (company?.positions && company.positions.length > 0) {
        form.setValue('internship_positionId', ''); 
      }
    } else {
      setSelectedCompany(null);
    }
  }, [selectedCompanyId, registrationType, sessionCompanies, form]);
  
  useEffect(() => {
      if (selectedCompany && internship_positionId) {
          const position = selectedCompany.positions?.find(p => p.id === internship_positionId);
          setSelectedPosition(position || null);
      } else {
          setSelectedPosition(null);
      }
  }, [selectedCompany, internship_positionId]);
  
  useEffect(() => {
      if (registrationType === 'early_internship' && earlyInternshipData) {
          form.setValue('internship_companyName', earlyInternshipData.companyName);
          form.setValue('internship_companyAddress', earlyInternshipData.companyAddress || '');
          form.setValue('internship_companySupervisorName', earlyInternshipData.supervisorName);
          form.setValue('internship_companySupervisorPhone', ''); // Not stored in early internship
      }
  }, [registrationType, earlyInternshipData, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const registrationDocRef = doc(firestore, 'defenseRegistrations', registration.id);

    let dataToUpdate: Partial<DefenseRegistration> = {
        internship_registrationFormLink: values.internship_registrationFormLink,
        internship_acceptanceLetterLink: values.internship_acceptanceLetterLink,
        internship_commitmentFormLink: values.internship_commitmentFormLink,
    };
    
    // Only update company details if the form is not locked (i.e., not approved or pending)
    if (!areCompanyFieldsDisabled) {
        dataToUpdate.internshipStatus = 'reporting';
        dataToUpdate.internshipRegistrationStatus = 'pending' as InternshipRegistrationStatus;
        dataToUpdate.internshipStatusNote = ''; // Clear previous rejection note on resubmission

        if (values.registrationType === 'from_list' && values.selectedCompanyId) {
            const company = sessionCompanies.find(c => c.id === values.selectedCompanyId);
            if (company) {
                dataToUpdate.internship_companyName = company.name;
                dataToUpdate.internship_companyAddress = company.address;
                const position = company.positions?.find(p => p.id === values.internship_positionId);
                 if (position) {
                    dataToUpdate.internship_positionId = position.id;
                    dataToUpdate.internship_positionTitle = position.title;
                    dataToUpdate.internship_companySupervisorName = position.supervisorName; // LHU Supervisor
                    dataToUpdate.internshipSupervisorId = position.supervisorId; // LHU Supervisor
                    dataToUpdate.internshipSupervisorName = position.supervisorName; // LHU Supervisor
                } else {
                    dataToUpdate.internship_companySupervisorName = company.contactName; // External contact
                    dataToUpdate.internship_companySupervisorPhone = company.contactPhone;
                }
            }
        } else if (values.registrationType === 'self_arranged') {
            dataToUpdate.internship_companyName = values.internship_companyName;
            dataToUpdate.internship_companyAddress = values.internship_companyAddress;
            dataToUpdate.internship_companySupervisorName = values.internship_companySupervisorName;
            dataToUpdate.internship_companySupervisorPhone = values.internship_companySupervisorPhone;
            dataToUpdate.internship_positionId = ''; // Clear position for self-arranged
            dataToUpdate.internship_positionTitle = ''; // Clear position for self-arranged
        } else if (values.registrationType === 'early_internship' && earlyInternshipData) {
             dataToUpdate.internship_companyName = earlyInternshipData.companyName;
             dataToUpdate.internship_companyAddress = earlyInternshipData.companyAddress;
             dataToUpdate.internship_companySupervisorName = earlyInternshipData.supervisorName;
             dataToUpdate.internshipSupervisorId = earlyInternshipData.supervisorId;
             dataToUpdate.internshipSupervisorName = earlyInternshipData.supervisorName;
             dataToUpdate.internship_positionId = ''; // Clear position for early internship
             dataToUpdate.internship_positionTitle = ''; // Clear position for early internship
        }
    }


    updateDoc(registrationDocRef, dataToUpdate)
        .then(() => {
            toast({
                title: 'Thành công',
                description: isApproved ? 'Các link tài liệu đã được cập nhật.' : 'Đơn đăng ký thực tập của bạn đã được gửi đi chờ duyệt.',
            });
            onSuccess(); // Refetch data in parent component
        })
        .catch(error => {
            const contextualError = new FirestorePermissionError({
                path: registrationDocRef.path,
                operation: 'update',
                requestResourceData: dataToUpdate,
            });
            errorEmitter.emit('permission-error', contextualError);
        });
  }

  return (
    <Form {...form}>
       {isRejected && registration.internshipStatusNote && (
            <Alert variant="destructive" className="mb-6">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Đăng ký bị từ chối</AlertTitle>
                <AlertDescription>
                    <p>Lý do: {registration.internshipStatusNote}</p>
                    <p className="mt-2">Vui lòng kiểm tra lại thông tin, chỉnh sửa và nộp lại.</p>
                </AlertDescription>
            </Alert>
        )}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
            control={form.control}
            name="registrationType"
            render={({ field }) => (
                <FormItem className="space-y-3">
                <FormLabel>Hình thức đăng ký</FormLabel>
                <FormControl>
                    <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-6"
                    disabled={areCompanyFieldsDisabled}
                    >
                    <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="from_list" /></FormControl>
                        <FormLabel className="font-normal">Chọn từ danh sách</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="self_arranged" /></FormControl>
                        <FormLabel className="font-normal">Tự tìm nơi thực tập</FormLabel>
                    </FormItem>
                    {hasCompletedEarlyInternship && (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="early_internship" /></FormControl>
                            <FormLabel className="font-normal">Đăng ký từ Thực tập sớm</FormLabel>
                        </FormItem>
                    )}
                    </RadioGroup>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />

            <Separator />
        
        {registrationType === 'from_list' && (
             <div className="space-y-4">
                 <FormField
                    control={form.control}
                    name="selectedCompanyId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Chọn Doanh nghiệp</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={areCompanyFieldsDisabled}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn một doanh nghiệp từ danh sách..." />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {sessionCompanies.map((company) => (
                                <SelectItem key={company.id} value={company.id}>
                                    {company.name}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                {selectedCompany && (
                     <Card>
                        <CardHeader>
                            <CardTitle>{selectedCompany.name}</CardTitle>
                            <CardDescription>{selectedCompany.website ? <a href={selectedCompany.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{selectedCompany.website}</a> : 'Không có website'}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             {selectedCompany.description && (
                                <>
                                  <div className="space-y-1">
                                      <p className="font-medium text-sm">Mô tả công ty</p>
                                      <p className="text-sm text-muted-foreground">{selectedCompany.description}</p>
                                  </div>
                                  <Separator />
                                </>
                            )}
                            {selectedCompany.positions && selectedCompany.positions.length > 0 && (
                                <FormField
                                    control={form.control}
                                    name="internship_positionId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Chọn Vị trí Thực tập</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={areCompanyFieldsDisabled}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Chọn một vị trí..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {selectedCompany.positions?.map((pos) => (
                                                        <SelectItem key={pos.id} value={pos.id}>
                                                            {pos.title} (Số lượng: {pos.quantity})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                            {selectedPosition && (
                                <Card className="bg-muted/50">
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Briefcase className="h-4 w-4" />
                                            {selectedPosition.title}
                                        </CardTitle>
                                        <CardDescription>Số lượng: {selectedPosition.quantity}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {selectedPosition.description && (
                                            <p className="text-sm text-muted-foreground">{selectedPosition.description}</p>
                                        )}
                                        {selectedPosition.supervisorName && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-muted-foreground">GVHD tại trường:</span>
                                                <span className="font-semibold">{selectedPosition.supervisorName}</span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}
                             <div className="space-y-3 text-sm">
                                <div className="flex items-start gap-3">
                                    <Building className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                    <div>
                                        <p className="font-medium">Địa chỉ</p>
                                        <p className="text-muted-foreground">{selectedCompany.address || 'Chưa có thông tin'}</p>
                                    </div>
                                </div>
                                <Separator />
                                <div className="flex items-start gap-3">
                                    <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                    <div>
                                        <p className="font-medium">Người liên hệ (nếu có)</p>
                                        <p className="text-muted-foreground">{selectedCompany.contactName || 'Chưa có thông tin'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                    <div>
                                        <p className="font-medium">Số điện thoại</p>
                                        <p className="text-muted-foreground">{selectedCompany.contactPhone || 'Chưa có thông tin'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                    <div>
                                        <p className="font-medium">Email</p>
                                        <p className="text-muted-foreground">{selectedCompany.contactEmail || 'Chưa có thông tin'}</p>
                                    </div>
                                </div>
                             </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        )}

        {registrationType === 'self_arranged' && (
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-medium">Thông tin Doanh nghiệp Tự tìm</h3>
                </div>
                <FormField
                control={form.control}
                name="internship_companyName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Tên đơn vị thực tập</FormLabel>
                    <FormControl>
                        <Input placeholder="Ví dụ: Công ty TNHH ABC" {...field} disabled={areCompanyFieldsDisabled}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="internship_companyAddress"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Địa chỉ đơn vị</FormLabel>
                    <FormControl>
                        <Input placeholder="Ví dụ: 123 Đường XYZ, Phường A, Quận B, TP.HCM" {...field} disabled={areCompanyFieldsDisabled}/>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                    control={form.control}
                    name="internship_companySupervisorName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Người hướng dẫn tại đơn vị</FormLabel>
                        <FormControl>
                            <Input placeholder="Ví dụ: Nguyễn Văn B" {...field} disabled={areCompanyFieldsDisabled}/>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="internship_companySupervisorPhone"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>SĐT người hướng dẫn</FormLabel>
                        <FormControl>
                            <Input placeholder="Ví dụ: 09xxxxxxxx" {...field} disabled={areCompanyFieldsDisabled}/>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
            </div>
        )}
        
        {registrationType === 'early_internship' && earlyInternshipData && (
             <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-medium">Thông tin từ Thực tập sớm</h3>
                    <p className="text-sm text-muted-foreground">Thông tin này được lấy từ quá trình thực tập sớm của bạn và không thể thay đổi.</p>
                </div>
                 <FormField
                    control={form.control}
                    name="internship_companyName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tên đơn vị thực tập</FormLabel>
                            <FormControl><Input {...field} disabled /></FormControl>
                        </FormItem>
                    )}
                 />
                 <FormField
                    control={form.control}
                    name="internship_companySupervisorName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Người hướng dẫn</FormLabel>
                            <FormControl><Input {...field} disabled /></FormControl>
                        </FormItem>
                    )}
                 />
             </div>
        )}

        <div className="space-y-6 pt-4">
             <div>
                <h3 className="text-lg font-medium">Link các Tài liệu Đăng ký</h3>
                <p className="text-sm text-muted-foreground">Dán link đến các tài liệu đã được lưu trữ trên Google Drive hoặc dịch vụ tương tự.</p>
            </div>

            <FormField
            control={form.control}
            name="internship_registrationFormLink"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Đơn đăng kí thực tập</FormLabel>
                <FormControl>
                    <Input placeholder="https://docs.google.com/..." {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="internship_acceptanceLetterLink"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Giấy tiếp nhận thực tập</FormLabel>
                <FormControl>
                    <Input placeholder="https://docs.google.com/..." {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="internship_commitmentFormLink"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Đơn cam kết tự đi thực tập (nếu có)</FormLabel>
                <FormControl>
                    <Input placeholder="https://docs.google.com/..." {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>


        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || (isApproved && !isRejected)}>
          {isApproved ? 'Đã duyệt' : (isPending ? 'Đang chờ duyệt' : (form.formState.isSubmitting ? 'Đang gửi...' : 'Gửi Đăng ký'))}
        </Button>
      </form>
    </Form>
  );
}
