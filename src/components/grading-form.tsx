
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
import { collection, writeBatch, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import type { Rubric, DefenseRegistration, Evaluation } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, Settings2, SlidersHorizontal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

export interface ProjectGroup {
    projectTitle: string;
    students: DefenseRegistration[];
}

interface GradingFormProps {
  projectGroup: ProjectGroup;
  rubric: Rubric;
  evaluationType: 'graduation' | 'internship';
  supervisorId: string;
  sessionId: string;
  onFinished: () => void;
  existingEvaluation?: Evaluation | null;
}

export function GradingForm({ projectGroup, rubric, evaluationType, supervisorId, sessionId, onFinished, existingEvaluation }: GradingFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isOverallMode, setIsOverallMode] = useState(false);

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
      overallScore: z.coerce.number().optional(),
      comments: z.string().optional(),
    });
  }, [rubric]);

  type GradingFormData = z.infer<typeof formSchema>;
  
  const maxTotalScore = useMemo(() => {
    return rubric.criteria.reduce((sum, criterion) => sum + criterion.maxScore, 0);
  }, [rubric]);


  const form = useForm<GradingFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: useMemo(() => {
        let defaultScores: Record<string, number> = {};
        if (existingEvaluation) {
             existingEvaluation.scores.forEach(s => {
                defaultScores[s.criterionId] = s.score;
            });
        } else {
            defaultScores = rubric.criteria.reduce((acc, c) => ({ ...acc, [c.id]: c.maxScore }), {});
        }
        return {
            scores: defaultScores,
            overallScore: existingEvaluation?.totalScore || maxTotalScore,
            comments: existingEvaluation?.comments || '',
        };
    }, [existingEvaluation, rubric, maxTotalScore])
  });
  
  useEffect(() => {
      let defaultScores: Record<string, number> = {};
      if (existingEvaluation) {
            existingEvaluation.scores.forEach(s => {
              defaultScores[s.criterionId] = s.score;
          });
      } else {
          defaultScores = rubric.criteria.reduce((acc, c) => ({ ...acc, [c.id]: c.maxScore }), {});
      }
      form.reset({
          scores: defaultScores,
          overallScore: existingEvaluation?.totalScore || maxTotalScore,
          comments: existingEvaluation?.comments || '',
      });
  }, [existingEvaluation, rubric, form, maxTotalScore]);

  const watchedScores = useWatch({
    control: form.control,
    name: 'scores',
  });
  
  const watchedOverallScore = useWatch({
      control: form.control,
      name: 'overallScore'
  });

  const totalScore = useMemo(() => {
    if (isOverallMode) {
        return watchedOverallScore || 0;
    }
    if (!watchedScores) return 0;
    return Object.values(watchedScores).reduce((sum, score) => sum + (Number(score) || 0), 0);
  }, [watchedScores, isOverallMode, watchedOverallScore]);
  

  const adjustScore = (fieldName: `scores.${string}`, amount: number, maxScore: number) => {
    const currentValue = Number(form.getValues(fieldName)) || 0;
    let newValue = currentValue + amount;
    newValue = Math.max(0, Math.min(newValue, maxScore));
    newValue = Math.round(newValue * 100) / 100;
    form.setValue(fieldName, newValue, { shouldValidate: true });
  };


  async function onSubmit(values: GradingFormData) {
    const batch = writeBatch(firestore);
    const evaluationsCollection = collection(firestore, 'evaluations');
    
    let scoresToSave: { criterionId: string; score: number }[];
    let totalScoreToSave: number;

    if (isOverallMode) {
      totalScoreToSave = Math.max(0, Math.min(values.overallScore || 0, maxTotalScore));
      scoresToSave = rubric.criteria.map(criterion => {
        const proportion = criterion.maxScore / maxTotalScore;
        const calculatedScore = totalScoreToSave * proportion;
        return {
          criterionId: criterion.id,
          score: Math.round(calculatedScore * 100) / 100, // Round to 2 decimal places
        };
      });
    } else {
      totalScoreToSave = totalScore;
      scoresToSave = Object.entries(values.scores).map(([criterionId, score]) => ({
          criterionId,
          score: Number(score),
      }));
    }


    projectGroup.students.forEach(student => {
        const evaluationId = existingEvaluation?.registrationId === student.id ? existingEvaluation.id : doc(evaluationsCollection).id;
        const evaluationDocRef = doc(firestore, 'evaluations', evaluationId);
            
        const evaluationData: Omit<Evaluation, 'id'> = {
            sessionId: sessionId,
            registrationId: student.id,
            evaluatorId: supervisorId,
            rubricId: rubric.id,
            evaluationType: evaluationType,
            scores: scoresToSave,
            totalScore: totalScoreToSave,
            comments: values.comments || '',
            evaluationDate: serverTimestamp(),
        };
        batch.set(evaluationDocRef, evaluationData);
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

  const getTitle = () => {
    const typeLabel = evaluationType === 'graduation' ? 'Tốt nghiệp' : 'Thực tập';
    if (projectGroup.students.length > 1 && evaluationType === 'graduation') {
        return `Phiếu Chấm Điểm ${typeLabel} - Nhóm`;
    }
    const student = projectGroup.students[0];
    return `Phiếu Chấm Điểm ${typeLabel} - ${student?.studentName} (${student?.studentId})`;
  }

   const getDescription = () => {
        if (evaluationType === 'internship') {
            const student = projectGroup.students[0];
            return `Chấm điểm thực tập cho sinh viên ${student?.studentName} (${student?.studentId}).`;
        }
        const studentNames = projectGroup.students.map(s => `${s.studentName} (${s.studentId})`).join(', ');
        return `Chấm điểm cho đề tài: "${projectGroup.projectTitle.startsWith('_individual_') ? 'Đề tài cá nhân' : projectGroup.projectTitle}" do sinh viên thực hiện: ${studentNames}.`;
    }

  return (
     <>
        <DialogHeader>
            <DialogTitle>{getTitle()}</DialogTitle>
            <DialogDescription>
               {getDescription()}
            </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                 <div className="flex items-center space-x-2">
                    <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="grading-mode" className={cn(isOverallMode && "text-muted-foreground")}>Chấm chi tiết</Label>
                    <Switch
                        id="grading-mode"
                        checked={isOverallMode}
                        onCheckedChange={setIsOverallMode}
                    />
                    <Label htmlFor="grading-mode" className={cn(!isOverallMode && "text-muted-foreground")}>Chấm điểm tổng</Label>
                    <Settings2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <Separator />
                 <ScrollArea className="h-[50vh] pr-6">
                    <div className="space-y-6">
                       {isOverallMode ? (
                           <FormField
                                control={form.control}
                                name="overallScore"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-lg font-semibold">Điểm tổng</FormLabel>
                                    <FormControl>
                                         <Input
                                            type="number"
                                            step="0.25"
                                            {...field}
                                            className="text-center text-xl h-14"
                                            onBlur={(e) => {
                                                const val = parseFloat(e.target.value);
                                                if (!isNaN(val)) {
                                                    const clamped = Math.max(0, Math.min(val, maxTotalScore));
                                                    field.onChange(clamped);
                                                } else {
                                                    field.onChange(0);
                                                }
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                       ) : (
                           rubric.criteria.map((criterion) => (
                            <FormField
                                key={criterion.id}
                                control={form.control}
                                name={`scores.${criterion.id}`}
                                render={({ field }) => (
                                <FormItem className="grid grid-cols-4 items-start gap-4">
                                    <div className="col-span-3 space-y-1">
                                        <FormLabel className="font-semibold">{criterion.name}</FormLabel>
                                         <div className={cn(
                                            "prose prose-sm text-muted-foreground max-w-none",
                                            "[&_ul]:list-disc [&_ul]:pl-4",
                                            "[&_ol]:list-decimal [&_ol]:pl-4"
                                            )}>
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {criterion.description || ''}
                                            </ReactMarkdown>
                                        </div>
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
                        ))
                       )}
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
                        Tổng điểm: <span className="text-primary">{(totalScore || 0).toFixed(2)}</span> / {maxTotalScore.toFixed(2)}
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
