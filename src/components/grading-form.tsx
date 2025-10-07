
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
import {
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, writeBatch, serverTimestamp, doc } from 'firebase/firestore';
import type { Rubric, DefenseRegistration, StudentWithRegistrationDetails } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { useEffect, useMemo } from 'react';
import { Minus, Plus } from 'lucide-react';

interface ProjectGroup {
    projectTitle: string;
    students: DefenseRegistration[];
}

interface GradingFormProps {
  projectGroup: ProjectGroup;
  rubric: Rubric;
  supervisorId: string;
  sessionId: string;
  onFinished: () => void;
}

export function GradingForm({ projectGroup, rubric, supervisorId, sessionId, onFinished }: GradingFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  // Dynamically create the schema based on the rubric
  const formSchema = useMemo(() => {
    const criteriaSchema = rubric.criteria.reduce((acc, criterion) => {
      acc[criterion.id] = z.coerce
        .number()
        .min(0, "Điểm không thể âm.")
        .max(criterion.maxScore, `Điểm không được vượt quá ${criterion.maxScore}.`);
      return acc;
    }, {} as Record<string, z.ZodType<any, any>>);

    return z.object({
      scores: z.object(criteriaSchema),
      comments: z.string().optional(),
    });
  }, [rubric]);

  type GradingFormData = z.infer<typeof formSchema>;

  const form = useForm<GradingFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      scores: rubric.criteria.reduce((acc, c) => ({ ...acc, [c.id]: 0 }), {}),
      comments: '',
    },
  });

  const watchedScores = useWatch({
    control: form.control,
    name: 'scores',
  });

  const totalScore = useMemo(() => {
    if (!watchedScores) return 0;
    return Object.values(watchedScores).reduce((sum, score) => sum + (Number(score) || 0), 0);
  }, [watchedScores]);
  
  const maxTotalScore = useMemo(() => {
    return rubric.criteria.reduce((sum, criterion) => sum + criterion.maxScore, 0);
  }, [rubric]);

  const adjustScore = (fieldName: `scores.${string}`, amount: number, maxScore: number) => {
    const currentValue = Number(form.getValues(fieldName)) || 0;
    let newValue = currentValue + amount;
    // Clamp the value between 0 and maxScore
    newValue = Math.max(0, Math.min(newValue, maxScore));
    // Round to 2 decimal places to avoid floating point issues
    newValue = Math.round(newValue * 100) / 100;
    form.setValue(fieldName, newValue, { shouldValidate: true });
  };


  async function onSubmit(values: GradingFormData) {
    const batch = writeBatch(firestore);
    const evaluationsCollection = collection(firestore, 'evaluations');

    projectGroup.students.forEach(student => {
        const evaluationDoc = doc(evaluationsCollection);
        const evaluationData = {
            sessionId: sessionId,
            registrationId: student.id,
            evaluatorId: supervisorId,
            rubricId: rubric.id,
            scores: Object.entries(values.scores).map(([criterionId, score]) => ({
                criterionId,
                score,
            })),
            totalScore: totalScore,
            comments: values.comments || '',
            evaluationDate: serverTimestamp(),
        };
        batch.set(evaluationDoc, evaluationData);
    });

    try {
        await batch.commit();
        toast({
            title: 'Thành công',
            description: `Đã lưu kết quả chấm điểm cho ${projectGroup.students.length} sinh viên.`,
        });
        onFinished();
    } catch(error) {
        console.error("Error saving evaluation:", error);
         const contextualError = new FirestorePermissionError({
          path: evaluationsCollection.path,
          operation: 'create',
          requestResourceData: { error: 'Batch write for evaluations' }
        });
        errorEmitter.emit('permission-error', contextualError);
    }
  }

  return (
     <>
        <DialogHeader>
            <DialogTitle>Phiếu Chấm Điểm</DialogTitle>
            <DialogDescription>
                Chấm điểm cho đề tài: "{projectGroup.projectTitle.startsWith('_individual_') ? 'Đề tài cá nhân' : projectGroup.projectTitle}"
            </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                 <ScrollArea className="h-[50vh] pr-6">
                    <div className="space-y-6">
                        {rubric.criteria.map((criterion) => (
                            <FormField
                                key={criterion.id}
                                control={form.control}
                                name={`scores.${criterion.id}`}
                                render={({ field }) => (
                                <FormItem className="grid grid-cols-4 items-start gap-4">
                                    <div className="col-span-3 space-y-1">
                                        <FormLabel className="font-semibold">{criterion.name}</FormLabel>
                                        <p className="text-xs text-muted-foreground">{criterion.description}</p>
                                    </div>
                                    <div className="col-span-1">
                                    <FormControl>
                                        <div className="relative flex items-center">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="h-9 w-9 rounded-r-none"
                                                onClick={() => adjustScore(field.name, -0.25, criterion.maxScore)}
                                            >
                                                <Minus className="h-4 w-4" />
                                            </Button>
                                            <Input
                                                type="number"
                                                step="0.25"
                                                {...field}
                                                className="z-10 rounded-none border-x-0 text-center"
                                                onBlur={(e) => {
                                                  const val = parseFloat(e.target.value);
                                                  if (!isNaN(val)) {
                                                    const clamped = Math.max(0, Math.min(val, criterion.maxScore));
                                                    field.onChange(clamped);
                                                  } else {
                                                    field.onChange(0);
                                                  }
                                                }}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="h-9 w-9 rounded-l-none"
                                                onClick={() => adjustScore(field.name, 0.25, criterion.maxScore)}
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                            <div className="absolute right-[-30px] top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                                / {criterion.maxScore}
                                            </div>
                                        </div>
                                    </FormControl>
                                    <FormMessage className="mt-1 text-xs" />
                                    </div>
                                </FormItem>
                                )}
                            />
                        ))}
                         <FormField
                            control={form.control}
                            name="comments"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold">Nhận xét chung</FormLabel>
                                    <FormControl>
                                        <Textarea
                                        placeholder="Nhập nhận xét, góp ý của bạn về đề tài này..."
                                        className="resize-y"
                                        {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </ScrollArea>
                <Separator />
                 <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between items-center">
                    <div className="text-lg font-bold">
                        Tổng điểm: <span className="text-primary">{totalScore.toFixed(2)}</span> / {maxTotalScore.toFixed(2)}
                    </div>
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={onFinished}>Hủy</Button>
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? "Đang lưu..." : "Lưu điểm"}
                        </Button>
                    </div>
                </DialogFooter>
            </form>
        </Form>
    </>
  );
}
