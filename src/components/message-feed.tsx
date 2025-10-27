
'use client';

import type { User } from 'firebase/auth';
import { MessageSquare, Send } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import type { Message } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

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

  const { data: messages, isLoading } = useCollection<Message>(messagesQuery);
  
  // Mark conversation as read
  useEffect(() => {
    if (conversationId && currentUser) {
      const convoRef = doc(firestore, 'conversations', conversationId);
      updateDoc(convoRef, {
        readBy: [currentUser.uid]
      }).catch(err => console.error("Could not mark conversation as read", err));
    }
  }, [conversationId, currentUser, firestore]);
  
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
    if (!newMessage.trim() || !conversationId) return;

    const messagesCollectionRef = collection(firestore, 'conversations', conversationId, 'messages');
    const conversationDocRef = doc(firestore, 'conversations', conversationId);

    try {
        const messageData = {
            conversationId: conversationId,
            senderId: currentUser.uid,
            senderName: currentUser.displayName || currentUser.email || 'N/A',
            content: newMessage,
            createdAt: serverTimestamp(),
        };

        // Use Promise.all to send message and update conversation metadata concurrently
        await Promise.all([
            addDoc(messagesCollectionRef, messageData),
            updateDoc(conversationDocRef, {
                lastMessageAt: serverTimestamp(),
                lastMessageSnippet: newMessage.substring(0, 90),
                readBy: [currentUser.uid], // Sender has read the message
            })
        ]);

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
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
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
                            <p className="font-semibold">{!isCurrentUser && msg.senderName}</p>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            <p className={cn(
                                "text-xs mt-1",
                                isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}>
                                {msg.createdAt?.toDate ? format(msg.createdAt.toDate(), 'HH:mm') : '...'}
                            </p>
                        </div>
                         {isCurrentUser && (
                            <Avatar className="h-8 w-8">
                                <AvatarFallback>{msg.senderName.substring(0, 2).toUpperCase()}</AvatarFallback>
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
