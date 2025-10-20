
'use client';

import { useState, useMemo } from 'react';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import type { GraduationDefenseSession, InternshipCompany } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from './ui/scroll-area';
import { Label } from './ui/label';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Info } from 'lucide-react';

interface AssignCompaniesToSessionDialogProps {
  companyIds: string[];
  onFinished: () => void;
}

export function AssignCompaniesToSessionDialog({
  companyIds,
  onFinished,
}: AssignCompaniesToSessionDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sessionsCollectionRef = useMemoFirebase(
    () => collection(firestore, 'graduationDefenseSessions'),
    [firestore]
  );
  const { data: sessions, isLoading: isLoadingSessions } = useCollection<GraduationDefenseSession>(sessionsCollectionRef);
  
  const companiesCollectionRef = useMemoFirebase(
    () => collection(firestore, 'internshipCompanies'),
    [firestore]
  );
  const { data: allCompanies, isLoading: isLoadingCompanies } = useCollection<InternshipCompany>(companiesCollectionRef);


  const availableSessions = useMemo(() => {
    if (!sessions) return [];
    // Filter for sessions that are not completed AND either
    // include internship OR don't have a sessionType specified (for backward compatibility).
    return sessions.filter(session => 
        session.status !== 'completed' &&
        (!session.sessionType || session.sessionType === 'internship' || session.sessionType === 'combined')
    );
  }, [sessions]);
  
  const companiesToAssign = useMemo(() => {
    if (!allCompanies) return [];
    return allCompanies.filter(company => companyIds.includes(company.id));
  }, [companyIds, allCompanies]);

  const handleSubmit = async () => {
    if (!selectedSessionId) {
      toast({
        variant: 'destructive',
        title: 'Chưa chọn đợt báo cáo',
        description: 'Vui lòng chọn một đợt báo cáo để gán doanh nghiệp.',
      });
      return;
    }
    setIsSubmitting(true);

    const sessionDocRef = doc(firestore, 'graduationDefenseSessions', selectedSessionId);

    try {
        // Use arrayUnion to safely add new company IDs without creating duplicates
        await updateDoc(sessionDocRef, {
            companyIds: arrayUnion(...companyIds)
        });

        toast({
            title: 'Thành công',
            description: `Đã gán ${companyIds.length} doanh nghiệp vào đợt báo cáo.`,
        });
        onFinished();

    } catch (error: any) {
        console.error('Error assigning companies to session:', error);
         const contextualError = new FirestorePermissionError({
          path: sessionDocRef.path,
          operation: 'update',
          requestResourceData: { companyIds: arrayUnion(...companyIds) },
        });
        errorEmitter.emit('permission-error', contextualError);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Gán Doanh nghiệp vào Đợt báo cáo</DialogTitle>
        <DialogDescription>
          Chọn một đợt báo cáo để gán {companiesToAssign.length} doanh nghiệp đã chọn.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <Select onValueChange={setSelectedSessionId} disabled={isLoadingSessions}>
          <SelectTrigger>
            <SelectValue placeholder={isLoadingSessions ? 'Đang tải...' : 'Chọn đợt báo cáo'} />
          </SelectTrigger>
          <SelectContent>
            {availableSessions?.map(session => (
              <SelectItem key={session.id} value={session.id}>
                {session.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isLoadingCompanies ? (
            <p>Đang tải danh sách công ty...</p>
        ) : companiesToAssign.length > 0 ? (
          <div>
            <Label>Doanh nghiệp sẽ được gán</Label>
            <ScrollArea className="h-40 mt-2 rounded-md border p-2">
              <ul className="space-y-1 text-sm">
                {companiesToAssign.map(company => (
                  <li key={company.id}>{company.name}</li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        ) : (
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Không có doanh nghiệp nào được chọn</AlertTitle>
                <AlertDescription>
                    Vui lòng quay lại và chọn ít nhất một doanh nghiệp.
                </AlertDescription>
            </Alert>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onFinished} disabled={isSubmitting}>
          Hủy
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting || companiesToAssign.length === 0 || !selectedSessionId}>
          {isSubmitting ? 'Đang gán...' : `Gán ${companiesToAssign.length} doanh nghiệp`}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
