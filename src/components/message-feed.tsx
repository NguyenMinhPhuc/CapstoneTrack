
'use client';

import type { User } from 'firebase/auth';
import { MessageSquare, Send } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, writeBatch, arrayUnion } from 'firebase/firestore';
import type { Message, SystemUser } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageFeedProps {
  currentUser: User;
  conversationId: string | null;
}

export function MessageFeed({ currentUser, conversationId }: MessageFeedProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useMemoFirebase(
    () =>
      conversationId
        ? query(
            collection(firestore, 'conversations', conversationId, 'messages'),
            orderBy('createdAt', 'asc')
          )
        : null,
    [firestore, conversationId]
  );
  
  const currentUserDocRef = useMemoFirebase(
      () => doc(firestore, 'users', currentUser.uid),
      [firestore, currentUser.uid]
  );
  const { data: currentUserData } = useDoc<SystemUser>(currentUserDocRef);

  const { data: messages, isLoading } = useCollection<Message>(messagesQuery);
  
  // Mark conversation as read
  useEffect(() => {
    if (conversationId && currentUser && messages && messages.length > 0) {
      const convoRef = doc(firestore, 'conversations', conversationId);
      updateDoc(convoRef, {
        readBy: arrayUnion(currentUser.uid)
      }).catch(err => console.error("Could not mark conversation as read", err));
    }
  }, [conversationId, currentUser, firestore, messages]);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
            setTimeout(() => {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }, 100);
        }
    }
  }, [messages]);


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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !currentUserData) return;

    const messagesCollectionRef = collection(firestore, 'conversations', conversationId, 'messages');
    const conversationDocRef = doc(firestore, 'conversations', conversationId);
    
    const messageRef = doc(messagesCollectionRef);

    try {
        const messageData = {
            id: messageRef.id,
            conversationId: conversationId,
            senderId: currentUser.uid,
            senderName: currentUserData.displayName || currentUserData.email || 'N/A',
            content: newMessage,
            createdAt: new Date(),
        };

        const batch = writeBatch(firestore);
        
        batch.set(messageRef, messageData);
        batch.update(conversationDocRef, {
            lastMessageAt: new Date(),
            lastMessageSnippet: newMessage.substring(0, 90),
            readBy: [currentUser.uid], // Sender has read the message
        });

        await batch.commit();
        setNewMessage('');
    } catch (error) {
        console.error("Error sending message:", error);
        toast({
            variant: 'destructive',
            title: 'Lỗi gửi tin nhắn',
            description: 'Không thể gửi tin nhắn của bạn. Vui lòng thử lại.',
        });
    }
  };


  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4 min-h-0" ref={scrollAreaRef}>
        {isLoading && (
            <div className="space-y-4">
                <Skeleton className="h-16 w-3/4" />
                <Skeleton className="h-16 w-3/4 ml-auto" />
                <Skeleton className="h-16 w-3/4" />
            </div>
        )}
        <div className="space-y-6">
            {messages?.map(msg => {
                const isCurrentUser = msg.senderId === currentUser.uid;
                return (
                    <div key={msg.id} className={cn("flex items-end gap-2", isCurrentUser && "justify-end")}>
                         {!isCurrentUser && (
                            <Avatar className="h-8 w-8">
                                <AvatarFallback>{msg.senderName.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                        )}
                        <div className={cn(
                            "max-w-md rounded-lg p-3 text-sm",
                            isCurrentUser
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                        )}>
                            {!isCurrentUser && <p className="font-semibold mb-1">{msg.senderName}</p>}
                             <div className={cn(
                                "prose prose-sm max-w-none text-inherit prose-p:my-0",
                                // For outgoing messages, brighten the link for better contrast on dark primary background
                                isCurrentUser 
                                    ? "prose-a:text-primary-foreground/80 hover:prose-a:text-primary-foreground" 
                                    : "prose-a:text-primary hover:prose-a:underline"
                             )}>
                                <ReactMarkdown 
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                      a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" />
                                  }}
                                >
                                  {msg.content}
                                </ReactMarkdown>
                            </div>
                            <p className={cn(
                                "text-xs mt-1",
                                isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}>
                                {msg.createdAt?.toDate ? format(msg.createdAt.toDate(), 'HH:mm') : '...'}
                            </p>
                        </div>
                         {isCurrentUser && (
                            <Avatar className="h-8 w-8">
                                <AvatarFallback>{currentUserData?.displayName?.substring(0,2).toUpperCase() || 'Me'}</AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                )
            })}
        </div>
      </ScrollArea>
      
      {/* Input Area */}
      <div className="p-4 border-t bg-background">
        <div className="relative">
            <Textarea
                placeholder="Nhập tin nhắn..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                    }
                }}
                className="pr-16"
            />
            <Button
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
            >
                <Send className="h-4 w-4" />
            </Button>
        </div>
      </div>
    </div>
  );
}
