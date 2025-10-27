'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { Conversation } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import React from 'react';

interface ConversationListProps {
  currentUser: User;
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
}

export function ConversationList({
  currentUser,
  selectedConversationId,
  onSelectConversation,
}: ConversationListProps) {
  const firestore = useFirestore();

  const conversationsQuery = useMemoFirebase(
    () =>
      currentUser?.uid // Only create query if user is available
        ? query(
            collection(firestore, 'conversations'),
            where('participantIds', 'array-contains', currentUser.uid),
            orderBy('lastMessageAt', 'desc')
          )
        : null, // Return null if no user, so useCollection waits
    [firestore, currentUser?.uid]
  );

  const { data: conversations, isLoading } = useCollection<Conversation>(conversationsQuery);


  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  // Handle case where collection doesn't exist or is empty
  if (!conversations || conversations.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <p className="text-sm text-muted-foreground">Chưa có hội thoại nào.</p>
        </div>
    );
  }


  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-1">
        {conversations.map(convo => {
            const isUnread = convo.readBy && !convo.readBy.includes(currentUser.uid);
            const otherParticipants = convo.participantNames.filter(name => name !== (currentUser.displayName || currentUser.email));
            const displaySubject = convo.subject || `Hội thoại với ${otherParticipants.join(', ')}`;
            
            return (
              <button
                key={convo.id}
                onClick={() => onSelectConversation(convo.id)}
                className={cn(
                  'w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors',
                  selectedConversationId === convo.id && 'bg-muted'
                )}
              >
                <div className="flex items-start justify-between">
                  <p className={cn('font-semibold truncate', isUnread && 'text-primary')}>
                    {displaySubject}
                  </p>
                  {convo.lastMessageAt && (
                     <p className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                        {formatDistanceToNow(convo.lastMessageAt.toDate(), { addSuffix: true, locale: vi })}
                    </p>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {isUnread && <span className="font-bold">(Mới) </span>}
                  {convo.lastMessageSnippet}
                </p>
              </button>
            );
          })
        }
      </div>
    </ScrollArea>
  );
}