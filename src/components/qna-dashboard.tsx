
'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
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
    <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] h-full border rounded-lg">
      {/* Left Column: Conversation List */}
      <div className="flex flex-col border-r h-full overflow-y-auto">
        <div className="p-4 border-b">
           <Dialog open={isNewConvoDialogOpen} onOpenChange={setIsNewConvoDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Tạo hội thoại mới
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Bắt đầu hội thoại mới</DialogTitle>
                  <DialogDescription>
                    Chọn người nhận, nhập chủ đề và tin nhắn đầu tiên của bạn.
                  </DialogDescription>
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

      {/* Right Column: Message Feed */}
      <div className="flex flex-col h-full overflow-hidden">
        <MessageFeed
          currentUser={currentUser}
          conversationId={selectedConversationId}
        />
      </div>
    </div>
  );
}
