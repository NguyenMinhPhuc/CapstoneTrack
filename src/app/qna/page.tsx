
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function QnaPage() {
  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare />
              Hỏi & Đáp
            </CardTitle>
            <CardDescription>
              Nơi trao đổi, đặt câu hỏi và nhận câu trả lời từ quản trị viên.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <p>Tính năng đang được xây dựng.</p>
              <p>Đây sẽ là nơi bạn có thể xem các cuộc hội thoại và gửi tin nhắn.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
