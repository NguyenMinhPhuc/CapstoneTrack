'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { ConversationList } from './conversation-list';
import { MessageFeed } from './message-feed';
import type { User } from 'firebase/auth';
import { NewConversationForm } from './new-conversation-form';

interface QnaDashboardProps {
  currentUser: User;
}

export function QnaDashboard({ currentUser }: QnaDashboardProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isNewConvoDialogOpen, setIsNewConvoDialogOpen] = useState(false);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] h-full gap-4">
      <div className="flex flex-col border rounded-lg h-full">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Hội thoại</h2>
          <Dialog open={isNewConvoDialogOpen} onOpenChange={setIsNewConvoDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Plus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Tạo hội thoại mới</DialogTitle>
                <DialogDescription>Bắt đầu một cuộc trò chuyện mới với một hoặc nhiều người.</DialogDescription>
              </DialogHeader>
              <NewConversationForm
                currentUser={currentUser}
                onFinished={() => setIsNewConvoDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
        <ConversationList
          currentUser={currentUser}
          selectedConversationId={selectedConversationId}
          onSelectConversation={setSelectedConversationId}
        />
      </div>

      <div className="border rounded-lg h-full">
        <MessageFeed
          currentUser={currentUser}
          conversationId={selectedConversationId}
        />
      </div>
    </div>
  );
}
