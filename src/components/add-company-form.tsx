
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
import { useToast } from '@/hooks/use-toast';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';

const formSchema = z.object({
  name: z.string().min(1, { message: 'Tên doanh nghiệp là bắt buộc.' }),
  address: z.string().optional(),
  website: z.string().url({ message: 'Vui lòng nhập URL hợp lệ.' }).optional().or(z.literal('')),
  description: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email({ message: 'Email không hợp lệ.' }).optional().or(z.literal('')),
  contactPhone: z.string().optional(),
});

interface AddCompanyFormProps {
  onFinished: () => void;
}

export function AddCompanyForm({ onFinished }: AddCompanyFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      address: '',
      website: '',
      description: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const companiesCollectionRef = collection(firestore, 'internshipCompanies');
    const newCompanyData = {
      ...values,
      createdAt: serverTimestamp(),
    };
    
    addDoc(companiesCollectionRef, newCompanyData)
      .then(() => {
        toast({
          title: 'Thành công',
          description: `Doanh nghiệp "${values.name}" đã được tạo.`,
        });
        onFinished();
      })
      .catch((error) => {
        const contextualError = new FirestorePermissionError({
          path: companiesCollectionRef.path,
          operation: 'create',
          requestResourceData: newCompanyData,
        });
        errorEmitter.emit('permission-error', contextualError);
      });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Thêm Doanh nghiệp mới</DialogTitle>
        <DialogDescription>
            Điền thông tin chi tiết của doanh nghiệp.
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
                    <FormLabel>Tên Doanh nghiệp</FormLabel>
                    <FormControl>
                      <Input placeholder="Công ty TNHH ABC" {...field} />
                    </FormControl>
                    <FormMessage />
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
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={onFinished}>Hủy</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Đang tạo..." : "Tạo Doanh nghiệp"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
