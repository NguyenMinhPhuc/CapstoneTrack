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
import { Alert, AlertTitle, AlertDescription } from './ui/alert';

interface QnaDashboardProps {
  currentUser: User;
}

export function QnaDashboard({ currentUser }: QnaDashboardProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isNewConvoDialogOpen, setIsNewConvoDialogOpen] = useState(false);

  return (
    <div className="flex items-center justify-center h-full p-8">
      <Alert className="max-w-md">
        <AlertTitle>Tính năng đang được xây dựng</AlertTitle>
        <AlertDescription>
          Tính năng Hỏi & Đáp đang được phát triển và sẽ sớm ra mắt. Cảm ơn bạn đã kiên nhẫn.
        </AlertDescription>
      </Alert>
    </div>
  );
}