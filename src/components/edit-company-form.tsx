
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, useFieldArray } from 'react-hook-form';
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
import { useToast } from '@/hooks/use-toast';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { InternshipCompany, Supervisor } from '@/lib/types';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Switch } from './ui/switch';
import { SupervisorCombobox } from './supervisor-combobox';
import { useState } from 'react';
import { Separator } from './ui/separator';
import { PlusCircle, Trash2 } from 'lucide-react';

const positionSchema = z.object({
  title: z.string().min(1, 'Tên vị trí không được để trống.'),
  quantity: z.coerce.number().min(1, 'Số lượng phải lớn hơn 0.'),
  description: z.string().optional(),
});

const formSchema = z.object({
  name: z.string().min(1, { message: 'Tên doanh nghiệp là bắt buộc.' }),
  address: z.string().optional(),
  website: z.string().url({ message: 'Vui lòng nhập URL hợp lệ.' }).optional().or(z.literal('')),
  description: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email({ message: 'Email không hợp lệ.' }).optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  isLHU: z.boolean().default(false),
  supervisorId: z.string().optional(),
  positions: z.array(positionSchema).optional(),
});

interface EditCompanyFormProps {
  company: InternshipCompany;
  onFinished: () => void;
}

export function EditCompanyForm({ company, onFinished }: EditCompanyFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
   const [selectedSupervisor, setSelectedSupervisor] = useState<Supervisor | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: company.name || '',
      address: company.address || '',
      website: company.website || '',
      description: company.description || '',
      contactName: company.contactName || '',
      contactEmail: company.contactEmail || '',
      contactPhone: company.contactPhone || '',
      isLHU: company.isLHU || false,
      supervisorId: company.supervisorId || '',
      positions: company.positions || [],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "positions",
  });

  const isLHU = useWatch({ control: form.control, name: 'isLHU' });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const companyDocRef = doc(firestore, 'internshipCompanies', company.id);
    
     let dataToUpdate: any = {
        name: values.name,
        address: values.address || '',
        website: values.website || '',
        description: values.description || '',
        isLHU: values.isLHU,
        positions: values.positions || [],
    };

    if (values.isLHU) {
        if (!selectedSupervisor && !values.supervisorId) {
             toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng chọn một giáo viên hướng dẫn cho phòng ban LHU.' });
            return;
        }
        dataToUpdate = {
            ...dataToUpdate,
            supervisorId: selectedSupervisor?.id || values.supervisorId,
            contactName: selectedSupervisor ? `${selectedSupervisor.firstName} ${selectedSupervisor.lastName}` : values.contactName,
            contactEmail: selectedSupervisor?.email || values.contactEmail,
            contactPhone: '', // Clear phone for LHU department
        };
    } else {
        dataToUpdate = {
            ...dataToUpdate,
            contactName: values.contactName || '',
            contactEmail: values.contactEmail || '',
            contactPhone: values.contactPhone || '',
            supervisorId: '', // Clear supervisorId if it's not an LHU dept
        };
    }

    updateDoc(companyDocRef, dataToUpdate)
      .then(() => {
        toast({
          title: 'Thành công',
          description: `Thông tin doanh nghiệp "${values.name}" đã được cập nhật.`,
        });
        onFinished();
      })
      .catch((error) => {
        const contextualError = new FirestorePermissionError({
          path: companyDocRef.path,
          operation: 'update',
          requestResourceData: dataToUpdate,
        });
        errorEmitter.emit('permission-error', contextualError);
      });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Chỉnh sửa Doanh nghiệp</DialogTitle>
        <DialogDescription>
            Cập nhật thông tin chi tiết của doanh nghiệp.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <ScrollArea className="h-[60vh] pr-6">
            <div className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên Doanh nghiệp / Phòng ban</FormLabel>
                    <FormControl>
                      <Input placeholder="Công ty TNHH ABC" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="isLHU"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Đây là phòng ban của LHU?</FormLabel>
                      <FormMessage />
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Địa chỉ</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Đường ABC, Quận 1, TP.HCM" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com" {...field} />
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
                    <FormLabel>Mô tả</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Mô tả về công ty, lĩnh vực hoạt động, vị trí thực tập, yêu cầu..."
                        className="resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />
               <div>
                  <h3 className="text-lg font-medium mb-2">Các vị trí tuyển dụng</h3>
                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="p-4 border rounded-md relative space-y-4">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                           <FormField
                            control={form.control}
                            name={`positions.${index}.title`}
                            render={({ field }) => (
                              <FormItem className="col-span-2">
                                <FormLabel>Tên vị trí</FormLabel>
                                <FormControl>
                                  <Input placeholder="Ví dụ: Thực tập sinh Frontend" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                           <FormField
                            control={form.control}
                            name={`positions.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Số lượng</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="1" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                         <FormField
                            control={form.control}
                            name={`positions.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Mô tả vị trí (tùy chọn)</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Yêu cầu, kỹ năng, công việc chính..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => append({ title: '', quantity: 1, description: '' })}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Thêm vị trí
                    </Button>
                  </div>
                </div>
              <Separator />

               {isLHU ? (
                 <FormField
                    control={form.control}
                    name="supervisorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Người phụ trách (GVHD)</FormLabel>
                        <FormControl>
                           <SupervisorCombobox
                                value={field.value || null}
                                onChange={(supervisor) => {
                                    field.onChange(supervisor?.id || '');
                                    setSelectedSupervisor(supervisor);
                                }}
                            />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              ) : (
                <>
                  <FormField
                    control={form.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên người liên hệ</FormLabel>
                        <FormControl>
                          <Input placeholder="Nguyễn Văn A" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="contactEmail"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email liên hệ</FormLabel>
                            <FormControl>
                            <Input placeholder="contact@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="contactPhone"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Số điện thoại liên hệ</FormLabel>
                            <FormControl>
                            <Input placeholder="090 xxx xxxx" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={onFinished}>Hủy</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}

    