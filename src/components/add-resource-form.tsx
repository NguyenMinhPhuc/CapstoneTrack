
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';

const formSchema = z.object({
  name: z.string().min(1, { message: 'Tên tài nguyên là bắt buộc.' }),
  summary: z.string().optional(),
  category: z.enum(['graduation', 'internship'], { required_error: 'Vui lòng chọn phân loại.' }),
  link: z.string().url({ message: 'Vui lòng nhập một URL hợp lệ.' }),
});

interface AddResourceFormProps {
  onFinished: () => void;
}

export function AddResourceForm({ onFinished }: AddResourceFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      summary: '',
      link: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const resourcesCollectionRef = collection(firestore, 'resources');
    
    const resourceData = {
        ...values,
        createdAt: serverTimestamp(),
    };

    try {
        await addDoc(resourcesCollectionRef, resourceData);
        toast({
          title: 'Thành công',
          description: `Tài nguyên "${values.name}" đã được tạo.`,
        });
        onFinished();
      } catch (error: any) {
        const contextualError = new FirestorePermissionError({
          path: resourcesCollectionRef.path,
          operation: 'create',
          requestResourceData: resourceData,
        });
        errorEmitter.emit('permission-error', contextualError);
      }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Thêm Tài nguyên mới</DialogTitle>
        <DialogDescription>
            Điền thông tin chi tiết của tài nguyên.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Tên tài nguyên</FormLabel>
                <FormControl>
                    <Input placeholder="Ví dụ: Mẫu báo cáo tốt nghiệp" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
                control={form.control}
                name="summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mô tả (tùy chọn)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Mô tả ngắn gọn về tài nguyên này"
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
                name="category"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Phân loại</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Chọn loại tài nguyên" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="graduation">Tốt nghiệp</SelectItem>
                            <SelectItem value="internship">Thực tập</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="link"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Link tải</FormLabel>
                    <FormControl>
                        <Input placeholder="https://example.com/tai-lieu.docx" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <DialogFooter className="pt-4 border-t">
                <Button type="button" variant="outline" onClick={onFinished}>Hủy</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Đang tạo..." : "Tạo Tài nguyên"}
                </Button>
            </DialogFooter>
        </form>
      </Form>
    </>
  );
}
