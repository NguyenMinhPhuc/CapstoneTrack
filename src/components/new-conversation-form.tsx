'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { UserCombobox } from './user-combobox';
import type { User } from 'firebase/auth';
import type { SystemUser } from '@/lib/types';
import { useState } from 'react';

const formSchema = z.object({
  recipients: z.array(z.string()).min(1, 'Vui lòng chọn ít nhất một người nhận.'),
  subject: z.string().min(3, 'Chủ đề phải có ít nhất 3 ký tự.'),
  message: z.string().min(1, 'Nội dung tin nhắn không được để trống.'),
});

interface NewConversationFormProps {
  currentUser: User;
  onFinished: () => void;
}

export function NewConversationForm({ currentUser, onFinished }: NewConversationFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [selectedUsers, setSelectedUsers] = useState<SystemUser[]>([]);

  const usersQuery = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: allUsers, isLoading } = useCollection<SystemUser>(usersQuery);

  const currentUserData = allUsers?.find(u => u.id === currentUser.uid);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipients: [],
      subject: '',
      message: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentUserData) {
        toast({ variant: 'destructive', title: 'Lỗi', description: 'Không tìm thấy thông tin người gửi.' });
        return;
    }

    const batch = writeBatch(firestore);
    const conversationRef = doc(collection(firestore, 'conversations'));
    const messageRef = doc(collection(firestore, 'conversations', conversationRef.id, 'messages'));
    
    const participantIds = [currentUser.uid, ...values.recipients];
    const participantNames = [currentUserData.displayName || currentUserData.email, ...selectedUsers.map(u => u.displayName || u.email)];


    const conversationData = {
      id: conversationRef.id,
      subject: values.subject,
      participantIds: Array.from(new Set(participantIds)),
      participantNames: Array.from(new Set(participantNames)),
      createdAt: new Date(),
      lastMessageAt: new Date(),
      lastMessageSnippet: values.message.substring(0, 90),
      readBy: [currentUser.uid],
    };

    const messageData = {
      id: messageRef.id,
      conversationId: conversationRef.id,
      senderId: currentUser.uid,
      senderName: currentUserData.displayName || currentUserData.email || 'N/A',
      content: values.message,
      createdAt: new Date(),
    };

    batch.set(conversationRef, conversationData);
    batch.set(messageRef, messageData);

    try {
        await batch.commit();
        toast({ title: 'Thành công', description: 'Đã bắt đầu hội thoại mới.' });
        onFinished();
    } catch(error) {
        console.error('Error creating conversation: ', error);
        toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể tạo hội thoại.' });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField
          control={form.control}
          name="recipients"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gửi đến</FormLabel>
              <FormControl>
                <UserCombobox
                  users={allUsers?.filter(u => u.id !== currentUser.uid) || []}
                  selectedUserIds={field.value}
                  onSelectionChange={(userIds, userObjects) => {
                      field.onChange(userIds);
                      setSelectedUsers(userObjects);
                  }}
                  isLoading={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Chủ đề</FormLabel>
              <FormControl>
                <Input placeholder="Ví dụ: Thắc mắc về cách nộp báo cáo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nội dung tin nhắn</FormLabel>
              <FormControl>
                <Textarea placeholder="Nhập tin nhắn đầu tiên của bạn..." {...field} className="min-h-[120px]" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Đang gửi...' : 'Bắt đầu hội thoại'}
        </Button>
      </form>
    </Form>
  );
}
