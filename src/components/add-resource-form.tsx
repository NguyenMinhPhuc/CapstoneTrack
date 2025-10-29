
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { PlusCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

const linkSchema = z.object({
  label: z.string().min(1, { message: 'Nhãn không được để trống.' }),
  url: z.string().url({ message: 'Vui lòng nhập một URL hợp lệ.' }),
});

const formSchema = z.object({
  name: z.string().min(1, { message: 'Tên tài nguyên là bắt buộc.' }),
  summary: z.string().optional(),
  category: z.enum(['graduation', 'internship'], { required_error: 'Vui lòng chọn phân loại.' }),
  links: z.array(linkSchema).min(1, { message: 'Phải có ít nhất một link.' }),
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
      links: [{ label: '', url: '' }],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "links"
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
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-4">
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
                  
                  <div>
                    <FormLabel>Danh sách Links</FormLabel>
                    <div className="space-y-4 mt-2">
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex items-start gap-2">
                          <div className="grid grid-cols-2 gap-2 flex-1">
                            <FormField
                              control={form.control}
                              name={`links.${index}.label`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input placeholder="Nhãn của link, ví dụ: 'Mẫu Word'" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                             <FormField
                              control={form.control}
                              name={`links.${index}.url`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input placeholder="https://example.com/file.docx" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => remove(index)}
                            disabled={fields.length <= 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ label: '', url: '' })}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Thêm Link
                      </Button>
                       {form.formState.errors.links && (
                          <p className="text-sm font-medium text-destructive">
                            {form.formState.errors.links.message}
                          </p>
                       )}
                    </div>
                  </div>
              </div>
            </ScrollArea>
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
