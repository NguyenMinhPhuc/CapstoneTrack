'use client';

import type { ProjectTopic } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Book, CheckCircle, Target, User, Users } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface RegisteredTopicDetailsProps {
  topic: ProjectTopic;
}

export function RegisteredTopicDetails({ topic }: RegisteredTopicDetailsProps) {
  return (
    <div>
        <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Đăng ký thành công!</AlertTitle>
            <AlertDescription>
                Bạn đã đăng ký đề tài dưới đây. Vui lòng liên hệ giáo viên hướng dẫn để được hỗ trợ.
            </AlertDescription>
        </Alert>
        <Card className="mt-6 border-primary">
            <CardHeader>
              <CardTitle>{topic.title}</CardTitle>
              <CardDescription className="flex items-center gap-2 pt-1">
                  <User className="h-4 w-4" />
                  {topic.supervisorName}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
              <div className="flex items-center gap-2">
                  <Badge variant="outline" className="flex items-center gap-1.5">
                    <Users className="h-3 w-3" />
                    {topic.maxStudents} Sinh viên
                  </Badge>
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
        </Card>
    </div>
  );
}
