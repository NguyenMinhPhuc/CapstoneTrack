
'use client';

import { useState, useMemo } from 'react';
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
import {
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import type { GraduationDefenseSession, DefenseRegistration, Evaluation, DefenseSubCommittee, SubCommitteeMember } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Copy } from 'lucide-react';


interface CopyEvaluationDialogProps {
    registration: DefenseRegistration;
    session: GraduationDefenseSession;
    evaluations: Evaluation[];
    subCommittees: DefenseSubCommittee[];
    reportType: 'graduation' | 'internship';
    onFinished: () => void;
}

const formSchema = z.object({
  sourceEvaluatorId: z.string({ required_error: 'Vui lòng chọn nguồn.' }),
  destinationEvaluatorId: z.string({ required_error: 'Vui lòng chọn đích.' }),
});


export function CopyEvaluationDialog({ 
    registration, 
    session, 
    evaluations, 
    subCommittees,
    reportType,
    onFinished 
}: CopyEvaluationDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const { availableSources, availableDestinations, rubricId } = useMemo(() => {
    const subCommittee = subCommittees.find(sc => sc.id === registration.subCommitteeId);
    if (!subCommittee) {
        return { availableSources: [], availableDestinations: [], rubricId: null };
    }
    
    const currentRubricId = reportType === 'graduation' 
        ? session.councilGraduationRubricId
        : session.councilInternshipRubricId;
        
    const membersWithEvaluations = new Set(
        evaluations
            .filter(e => e.registrationId === registration.id && e.rubricId === currentRubricId)
            .map(e => e.evaluatorId)
    );

    const sources = subCommittee.members.filter(m => membersWithEvaluations.has(m.supervisorId));
    const destinations = subCommittee.members;

    return { availableSources: sources, availableDestinations: destinations, rubricId: currentRubricId };
  }, [registration, session, evaluations, subCommittees, reportType]);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (values.sourceEvaluatorId === values.destinationEvaluatorId) {
        toast({ variant: 'destructive', title: 'Lỗi', description: 'Nguồn và đích không thể giống nhau.' });
        return;
    }
    
    const sourceEvaluation = evaluations.find(e => 
        e.evaluatorId === values.sourceEvaluatorId &&
        e.registrationId === registration.id &&
        e.rubricId === rubricId
    );

    if (!sourceEvaluation) {
        toast({ variant: 'destructive', title: 'Lỗi', description: 'Không tìm thấy phiếu chấm điểm nguồn.' });
        return;
    }

    const batch = writeBatch(firestore);
    const evaluationsCollection = collection(firestore, 'evaluations');
    
    // Find if a destination evaluation already exists to update it, otherwise create new
    const existingDestEvaluation = evaluations.find(e => 
        e.evaluatorId === values.destinationEvaluatorId &&
        e.registrationId === registration.id &&
        e.rubricId === rubricId
    );
    
    const destEvaluationDocRef = existingDestEvaluation 
        ? doc(firestore, 'evaluations', existingDestEvaluation.id)
        : doc(evaluationsCollection);


    const newEvaluationData: Omit<Evaluation, 'id'> = {
        sessionId: session.id,
        registrationId: registration.id,
        evaluatorId: values.destinationEvaluatorId,
        rubricId: sourceEvaluation.rubricId,
        evaluationType: sourceEvaluation.evaluationType,
        scores: sourceEvaluation.scores,
        totalScore: sourceEvaluation.totalScore,
        comments: `(Sao chép từ ${availableSources.find(s=>s.supervisorId === values.sourceEvaluatorId)?.name || 'N/A'}) ${sourceEvaluation.comments || ''}`,
        evaluationDate: serverTimestamp(),
    };
    
    batch.set(destEvaluationDocRef, newEvaluationData);

    try {
        await batch.commit();
        toast({
            title: 'Thành công',
            description: 'Đã sao chép phiếu điểm thành công.',
        });
        onFinished();
    } catch(error) {
        console.error("Error copying evaluation:", error);
         const contextualError = new FirestorePermissionError({
          path: destEvaluationDocRef.path,
          operation: 'write',
          requestResourceData: newEvaluationData,
        });
        errorEmitter.emit('permission-error', contextualError);
    }
  }

  if (availableSources.length === 0) {
    return (
      <>
        <DialogHeader>
            <DialogTitle>Sao chép Điểm</DialogTitle>
             <DialogDescription>
                Sao chép toàn bộ phiếu điểm của một thành viên hội đồng cho một thành viên khác.
            </DialogDescription>
        </DialogHeader>
        <Alert>
            <Copy className="h-4 w-4" />
            <AlertTitle>Không có điểm để sao chép</AlertTitle>
            <AlertDescription>
                Chưa có thành viên hội đồng nào chấm điểm cho sinh viên này.
            </AlertDescription>
        </Alert>
        <DialogFooter>
             <Button type="button" variant="outline" onClick={onFinished}>Đóng</Button>
        </DialogFooter>
      </>
    )
  }

  return (
    <>
        <DialogHeader>
            <DialogTitle>Sao chép Điểm</DialogTitle>
            <DialogDescription>
                Sao chép toàn bộ phiếu điểm của một thành viên hội đồng cho một thành viên khác đối với sinh viên <span className="font-bold">{registration.studentName}</span>.
            </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                 <FormField
                    control={form.control}
                    name="sourceEvaluatorId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Sao chép TỪ</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn thành viên đã chấm điểm" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {availableSources.map(member => (
                                <SelectItem key={member.supervisorId} value={member.supervisorId}>{member.name} ({member.role})</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                 <FormField
                    control={form.control}
                    name="destinationEvaluatorId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Sao chép ĐẾN</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn thành viên sẽ nhận điểm" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                             {availableDestinations.map(member => (
                                <SelectItem key={member.supervisorId} value={member.supervisorId}>{member.name} ({member.role})</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={onFinished}>Hủy</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? "Đang sao chép..." : "Xác nhận sao chép"}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    </>
  );
}
