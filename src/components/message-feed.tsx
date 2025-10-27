'use client';

import type { User } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { MessageSquare } from 'lucide-react';

interface MessageFeedProps {
  currentUser: User;
  conversationId: string | null;
}

export function MessageFeed({ currentUser, conversationId }: MessageFeedProps) {
  if (!conversationId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <MessageSquare className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Chọn một hội thoại</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Chọn một hội thoại từ bên trái để xem tin nhắn hoặc bắt đầu một hội thoại mới.
        </p>
      </div>
    );
  }

  // In the next step, we will implement message fetching and display here.
  return (
    <div className="p-4">
      <h2 className="font-semibold">Tin nhắn cho hội thoại: {conversationId}</h2>
       <div className="text-center py-12 text-muted-foreground">
          <p>Tính năng hiển thị và gửi tin nhắn sẽ được xây dựng ở bước tiếp theo.</p>
        </div>
    </div>
  );
}
