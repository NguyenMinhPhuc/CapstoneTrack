
'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, where, doc, writeBatch } from 'firebase/firestore';
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
import { Book, CheckCircle, Target, User, Users, Tag } from 'lucide-react';
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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';


interface TopicRegistrationListProps {
  session: GraduationDefenseSession;
  registration: DefenseRegistration;
  onRegistrationSuccess: () => void;
}

export function TopicRegistrationList({ session, registration, onRegistrationSuccess }: TopicRegistrationListProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch all approved topics for the session
  const topicsQuery = useMemoFirebase(
    () => {
      if (!session?.id) return null;
      return query(
        collection(firestore, 'projectTopics'),
        where('sessionId', '==', session.id),
        where('status', 'in', ['approved', 'taken']) // Fetch both to calculate counts accurately
      )
    },
    [firestore, session]
  );
  const { data: topics, isLoading: isLoadingTopics } = useCollection<ProjectTopic>(topicsQuery);
  
  // 2. Fetch all registrations for the session to count students per topic
  const registrationsQuery = useMemoFirebase(
      () => {
        if (!session?.id) return null;
        return query(
            collection(firestore, 'defenseRegistrations'),
            where('sessionId', '==', session.id)
        )
      },
      [firestore, session]
  );
  const { data: allRegistrations, isLoading: isLoadingRegs } = useCollection<DefenseRegistration>(registrationsQuery);

  // 3. Process data to get available topics and student counts
  const { availableTopics, topicRegistrationCounts } = useMemo(() => {
    if (!topics || !allRegistrations) {
        return { availableTopics: [], topicRegistrationCounts: new Map() };
    }
    
    const counts = new Map<string, number>();
    allRegistrations.forEach(reg => {
        if (reg.projectTitle) {
            // Use a composite key to be more specific
            const key = `${reg.sessionId}-${reg.projectTitle}-${reg.supervisorId}`;
            counts.set(key, (counts.get(key) || 0) + 1);
        }
    });

    const filtered = topics.filter(topic => {
      const key = `${topic.sessionId}-${topic.title}-${topic.supervisorId}`;
      const currentCount = counts.get(key) || 0;
      return topic.status === 'approved' || (topic.status === 'taken' && currentCount < topic.maxStudents);
    });

    return { availableTopics: filtered, topicRegistrationCounts: counts };
  }, [topics, allRegistrations]);


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
      projectRegistrationStatus: 'pending', // Set status to pending
    });

    // 2. Update the topic's status if it's now full
    const key = `${topic.sessionId}-${topic.title}-${topic.supervisorId}`;
    const currentCount = topicRegistrationCounts.get(key) || 0;
    if (currentCount + 1 >= topic.maxStudents) {
        const topicRef = doc(firestore, 'projectTopics', topic.id);
        batch.update(topicRef, {
            status: 'taken',
        });
    }

    try {
      await batch.commit();
      toast({
        title: 'Đăng ký thành công!',
        description: `Bạn đã đăng ký đề tài "${topic.title}". Vui lòng chờ GVHD xác nhận.`,
      });
      onRegistrationSuccess(); // Notify parent to refetch
    } catch (error: any) {
      console.error("Error registering for topic: ", error);
      toast({
        variant: 'destructive',
        title: 'Đăng ký thất bại',
        description: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
      });
       const contextualError = new FirestorePermissionError({
            path: `batch write on topic ${topic.id} and registration ${registration.id}`,
            operation: 'update',
        });
        errorEmitter.emit('permission-error', contextualError);
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const isLoading = isLoadingTopics || isLoadingRegs;

  if (isLoading) {
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

  if (availableTopics.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-12">
            <h3 className="text-xl font-semibold">Không có đề tài nào</h3>
            <p>Hiện tại chưa có đề tài nào được mở để đăng ký trong đợt này.</p>
        </div>
      )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {availableTopics.map(topic => {
        const key = `${topic.sessionId}-${topic.title}-${topic.supervisorId}`;
        const registeredCount = topicRegistrationCounts.get(key) || 0;
        const isFull = registeredCount >= topic.maxStudents;

        return (
          <Card key={topic.id} className="flex flex-col">
            <CardHeader>
              <CardTitle>{topic.title}</CardTitle>
              <CardDescription className="flex items-center gap-2 pt-1">
                  <User className="h-4 w-4" />
                  {topic.supervisorName}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="flex items-center gap-1.5">
                    <Users className="h-3 w-3" />
                    {topic.maxStudents} Sinh viên
                  </Badge>
                  {topic.field && (
                    <Badge variant="secondary" className="flex items-center gap-1.5">
                      <Tag className="h-3 w-3" />
                      {topic.field}
                    </Badge>
                  )}
                  <Badge variant="secondary">Đã đăng ký: {registeredCount}/{topic.maxStudents}</Badge>
              </div>
                <div className={cn(
                "prose prose-sm text-muted-foreground max-w-none space-y-3",
                "[&_ul]:list-disc [&_ul]:pl-4",
                "[&_ol]:list-decimal [&_ol]:pl-4",
                "[&_p]:m-0"
              )}>
                  <div className="flex items-start gap-3">
                      <Book className="h-4 w-4 mt-1 shrink-0" />
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{topic.summary}</ReactMarkdown>
                  </div>
                  {topic.objectives && (
                      <div className="flex items-start gap-3">
                          <Target className="h-4 w-4 mt-1 shrink-0" />
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{topic.objectives}</ReactMarkdown>
                      </div>
                  )}
                  {topic.expectedResults && (
                      <div className="flex items-start gap-3">
                          <CheckCircle className="h-4 w-4 mt-1 shrink-0" />
                           <ReactMarkdown remarkPlugins={[remarkGfm]}>{topic.expectedResults}</ReactMarkdown>
                      </div>
                  )}
              </div>
            </CardContent>
            <CardFooter>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="w-full" disabled={isSubmitting || isFull}>
                      {isFull ? 'Đề tài đã đủ' : 'Đăng ký'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Xác nhận đăng ký đề tài?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bạn có chắc chắn muốn đăng ký đề tài <span className="font-bold">"{topic.title}"</span>? Hành động này không thể hoàn tác trực tiếp, nhưng bạn có thể hủy đăng ký sau nếu muốn.
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
        )
      })}
    </div>
  );
}
