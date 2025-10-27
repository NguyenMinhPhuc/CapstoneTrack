'use client';

import { useState } from 'react';
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
import { useFirestore } from '@/firebase';
import { writeBatch, doc } from 'firebase/firestore';
import type { GraduationDefenseSession } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from './ui/scroll-area';
import { Label } from './ui/label';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Info } from 'lucide-react';

interface MoveTopicsDialogProps {
  topicIds: string[];
  sessions: GraduationDefenseSession[];
  onFinished: () => void;
}

export function MoveTopicsDialog({
  topicIds,
  sessions,
  onFinished,
}: MoveTopicsDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedSessionId) {
      toast({
        variant: 'destructive',
        title: 'Chưa chọn đợt báo cáo',
        description: 'Vui lòng chọn một đợt báo cáo để chuyển đề tài đến.',
      });
      return;
    }
    if (topicIds.length === 0) {
        toast({
            variant: 'destructive',
            title: 'Chưa chọn đề tài',
            description: 'Vui lòng chọn ít nhất một đề tài để chuyển.',
        });
        return;
    }
    setIsSubmitting(true);

    const batch = writeBatch(firestore);
    
    topicIds.forEach(topicId => {
      const topicRef = doc(firestore, 'projectTopics', topicId);
      batch.update(topicRef, { sessionId: selectedSessionId });
    });

    try {
      await batch.commit();
      toast({
        title: 'Thành công',
        description: `Đã chuyển ${topicIds.length} đề tài sang đợt báo cáo mới.`,
      });
      onFinished();
    } catch (error: any) {
      console.error('Error moving topics:', error);
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: `Không thể chuyển đề tài: ${error.message}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Chuyển đề tài sang đợt khác</DialogTitle>
        <DialogDescription>
          Chuyển {topicIds.length} đề tài đã chọn sang một đợt báo cáo khác.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <Select onValueChange={setSelectedSessionId} disabled={!sessions || sessions.length === 0}>
          <SelectTrigger>
            <SelectValue placeholder={sessions?.length > 0 ? 'Chọn đợt báo cáo mới' : 'Không có đợt nào khác'} />
          </SelectTrigger>
          <SelectContent>
            {sessions?.map(session => (
              <SelectItem key={session.id} value={session.id}>
                {session.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {topicIds.length > 0 ? (
          <div>
            <Label>Số đề tài sẽ được chuyển: {topicIds.length}</Label>
          </div>
        ) : (
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Không có đề tài nào được chọn</AlertTitle>
                <AlertDescription>
                    Vui lòng quay lại và chọn ít nhất một đề tài.
                </AlertDescription>
            </Alert>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onFinished} disabled={isSubmitting}>
          Hủy
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting || topicIds.length === 0 || !selectedSessionId}>
          {isSubmitting ? 'Đang chuyển...' : `Chuyển ${topicIds.length} đề tài`}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
