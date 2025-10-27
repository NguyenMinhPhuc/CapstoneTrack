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
      query(
        collection(firestore, 'conversations'),
        where('participantIds', 'array-contains', currentUser.uid),
        orderBy('lastMessageAt', 'desc')
      ),
    [firestore, currentUser.uid]
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

  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-1">
        {conversations && conversations.length > 0 ? (
          conversations.map(convo => {
            const isUnread = convo.readBy && !convo.readBy.includes(currentUser.uid);
            return (
              <button
                key={convo.id}
                onClick={() => onSelectConversation(convo.id)}
                className={cn(
                  'w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors',
                  selectedConversationId === convo.id && 'bg-muted'
                )}
              >
                <div className="flex items-center justify-between">
                  <p className={cn('font-semibold truncate', isUnread && 'text-primary')}>
                    {convo.subject}
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
        ) : (
          <div className="text-center text-sm text-muted-foreground p-8">
            Chưa có hội thoại nào.
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
