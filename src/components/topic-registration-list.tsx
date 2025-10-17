
'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc, writeBatch } from 'firebase/firestore';
import type { GraduationDefenseSession, ProjectTopic, DefenseRegistration } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Book, CheckCircle, Target, User, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface TopicRegistrationListProps {
  session: GraduationDefenseSession;
  registration: DefenseRegistration;
}

export function TopicRegistrationList({ session, registration }: TopicRegistrationListProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const topicsQuery = useMemoFirebase(
    () => query(
      collection(firestore, 'projectTopics'),
      where('sessionId', '==', session.id),
      where('status', '==', 'available')
    ),
    [firestore, session.id]
  );
  const { data: topics, isLoading: isLoadingTopics } = useCollection<ProjectTopic>(topicsQuery);

  const handleRegister = async (topic: ProjectTopic) => {
    setIsSubmitting(true);
    
    const batch = writeBatch(firestore);

    // 1. Update the student's registration document
    const registrationRef = doc(firestore, 'defenseRegistrations', registration.id);
    batch.update(registrationRef, {
      projectTitle: topic.title,
      summary: topic.summary,
      objectives: topic.objectives,
      expectedResults: topic.expectedResults,
      supervisorId: topic.supervisorId,
      supervisorName: topic.supervisorName,
    });

    // 2. Update the topic's status
    const topicRef = doc(firestore, 'projectTopics', topic.id);
    batch.update(topicRef, {
      status: 'taken',
    });

    try {
      await batch.commit();
      toast({
        title: 'Đăng ký thành công!',
        description: `Bạn đã đăng ký đề tài "${topic.title}".`,
      });
      // The page will automatically reflect the change due to real-time updates.
    } catch (error: any) {
      console.error("Error registering for topic: ", error);
      toast({
        variant: 'destructive',
        title: 'Đăng ký thất bại',
        description: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
      });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (isLoadingTopics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-full" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (!topics || topics.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-12">
            <h3 className="text-xl font-semibold">Không có đề tài nào</h3>
            <p>Hiện tại chưa có đề tài nào được mở để đăng ký trong đợt này.</p>
        </div>
      )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {topics.map(topic => (
        <Card key={topic.id} className="flex flex-col">
          <CardHeader>
            <CardTitle>{topic.title}</CardTitle>
            <CardDescription className="flex items-center gap-2 pt-1">
                <User className="h-4 w-4" />
                {topic.supervisorName}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-4">
             <div className="flex items-center gap-2">
                 <Badge variant="outline">{topic.maxStudents === 1 ? '1 Sinh viên' : 'Nhóm 2 Sinh viên'}</Badge>
             </div>
            <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                    <Book className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{topic.summary}</span>
                </div>
                 {topic.objectives && (
                    <div className="flex items-start gap-3">
                        <Target className="h-4 w-4 mt-0.5 shrink-0" />
                        <span className="whitespace-pre-wrap">{topic.objectives}</span>
                    </div>
                )}
                 {topic.expectedResults && (
                     <div className="flex items-start gap-3">
                        <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span className="whitespace-pre-wrap">{topic.expectedResults}</span>
                    </div>
                )}
            </div>
          </CardContent>
          <CardFooter>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="w-full" disabled={isSubmitting}>
                    Đăng ký
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xác nhận đăng ký đề tài?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bạn có chắc chắn muốn đăng ký đề tài <span className="font-bold">"{topic.title}"</span>? Hành động này không thể hoàn tác.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleRegister(topic)}>
                    Xác nhận
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
