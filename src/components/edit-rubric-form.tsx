
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
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { PlusCircle, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { Rubric } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';

const criterionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, { message: 'Tên tiêu chí là bắt buộc.' }),
  description: z.string().optional(),
  maxScore: z.coerce.number().min(1, { message: 'Điểm phải lớn hơn 0.' }),
  PLO: z.string().optional(),
  PI: z.string().optional(),
  CLO: z.string().optional(),
});

const rubricSchema = z.object({
  name: z.string().min(1, { message: 'Tên rubric là bắt buộc.' }),
  description: z.string().optional(),
  criteria: z.array(criterionSchema).min(1, 'Cần ít nhất một tiêu chí.'),
});

type RubricFormData = z.infer<typeof rubricSchema>;

interface EditRubricFormProps {
  rubric: Rubric;
  onFinished: () => void;
}

export function EditRubricForm({ rubric, onFinished }: EditRubricFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<RubricFormData>({
    resolver: zodResolver(rubricSchema),
    defaultValues: {
      name: rubric.name,
      description: rubric.description,
      criteria: rubric.criteria.map(c => ({...c, id: c.id || uuidv4()})), // Ensure ID exists
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "criteria",
  });

  async function onSubmit(values: RubricFormData) {
    try {
      const rubricRef = doc(firestore, 'rubrics', rubric.id);
      await updateDoc(rubricRef, values);
      toast({
        title: 'Thành công',
        description: `Đã cập nhật rubric "${values.name}".`,
      });
      onFinished();
    } catch (error: any) {
      console.error("Error updating rubric:", error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: `Không thể cập nhật rubric: ${error.message}`,
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tên Rubric</FormLabel>
                <FormControl>
                  <Input placeholder="Ví dụ: Rubric chấm báo cáo cuối kỳ" {...field} />
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
                  <Input placeholder="Mô tả mục đích của rubric này" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Các tiêu chí</h3>
           <ScrollArea className="h-[40vh] pr-4">
                <div className="space-y-4">
                    {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-12 gap-x-4 gap-y-2 p-4 border rounded-lg relative">
                            <div className="col-span-12 md:col-span-4">
                                <FormField
                                control={form.control}
                                name={`criteria.${index}.name`}
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Tên tiêu chí</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ví dụ: Nội dung báo cáo" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                            </div>
                            <div className="col-span-12 md:col-span-6">
                                <FormField
                                control={form.control}
                                name={`criteria.${index}.description`}
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Mô tả chi tiết (tùy chọn)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Giải thích rõ hơn về tiêu chí này" {...field} className="h-10 resize-none"/>
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                            </div>
                            <div className="col-span-8 md:col-span-1">
                                <FormField
                                control={form.control}
                                name={`criteria.${index}.maxScore`}
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Điểm tối đa</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                            </div>
                             <div className="col-span-4 md:col-span-1 flex items-end justify-end">
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => remove(index)}
                                    className="h-10 w-10"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                             <div className="col-span-4">
                               <FormField
                                control={form.control}
                                name={`criteria.${index}.PLO`}
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>PLO</FormLabel>
                                    <FormControl>
                                        <Input placeholder="PLO 1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                            </div>
                             <div className="col-span-4">
                               <FormField
                                control={form.control}
                                name={`criteria.${index}.PI`}
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>PI</FormLabel>
                                    <FormControl>
                                        <Input placeholder="PI 1.1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                            </div>
                             <div className="col-span-4">
                               <FormField
                                control={form.control}
                                name={`criteria.${index}.CLO`}
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>CLO</FormLabel>
                                    <FormControl>
                                        <Input placeholder="CLO 1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
          <Button
            type="button"
            variant="outline"
            onClick={() => append({ id: uuidv4(), name: '', description: '', maxScore: 10, PLO: '', PI: '', CLO: '' })}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Thêm tiêu chí
          </Button>
           {form.formState.errors.criteria && (
                <p className="text-sm font-medium text-destructive">
                    {form.formState.errors.criteria.message || form.formState.errors.criteria.root?.message}
                </p>
            )}
        </div>

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </form>
    </Form>
  );
}
