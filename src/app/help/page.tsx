
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, UserCheck, Shield } from "lucide-react";

export default function HelpPage() {
  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Hướng dẫn sử dụng hệ thống CapstoneTrack</CardTitle>
            <CardDescription>
              Chào mừng bạn đến với hệ thống quản lý Đồ án Tốt nghiệp và Thực tập. Dưới đây là một số hướng dẫn cơ bản để bạn bắt đầu.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="text-primary" />
              Dành cho Sinh viên
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose prose-sm max-w-none text-foreground [&_ul]:list-disc [&_ul]:pl-5">
              <p>Là một sinh viên, bạn có thể thực hiện các chức năng chính sau:</p>
              <ul>
                <li><strong>Đăng ký Đề tài:</strong> Truy cập mục "Đăng ký Đề tài" để xem danh sách các đề tài được giáo viên đề xuất và chọn đề tài bạn muốn thực hiện.</li>
                <li><strong>Nộp Thuyết minh:</strong> Sau khi được GVHD xác nhận đăng ký, bạn cần vào mục "Nộp thuyết minh" để điền chi tiết và gửi duyệt.</li>
                <li><strong>Báo cáo Tiến độ:</strong> Hàng tuần, bạn cần vào mục "Báo cáo Tiến độ" để cập nhật công việc đã làm và kế hoạch cho tuần tiếp theo.</li>
                <li><strong>Đăng ký Thực tập:</strong> Tìm và đăng ký nơi thực tập trong các đợt được mở bởi khoa.</li>
                <li><strong>Nộp hồ sơ:</strong> Cung cấp các tài liệu cần thiết cho việc báo cáo tốt nghiệp và thực tập.</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="text-primary" />
              Dành cho Giáo viên Hướng dẫn
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="prose prose-sm max-w-none text-foreground [&_ul]:list-disc [&_ul]:pl-5">
                <p>Với vai trò là giáo viên, bạn có các quyền sau:</p>
                <ul>
                    <li><strong>Quản lý Đề tài của tôi:</strong> Đề xuất, chỉnh sửa và quản lý các đề tài tốt nghiệp bạn muốn hướng dẫn.</li>
                    <li><strong>Duyệt đăng ký của sinh viên:</strong> Xác nhận hoặc từ chối các yêu cầu đăng ký đề tài từ sinh viên.</li>
                    <li><strong>Duyệt thuyết minh và báo cáo:</strong> Xem xét, góp ý và duyệt các bản thuyết minh, báo cáo cuối kỳ của sinh viên.</li>
                    <li><strong>Chấm điểm:</strong> Thực hiện chấm điểm cho sinh viên bạn hướng dẫn hoặc với tư cách thành viên hội đồng.</li>
                    <li><strong>Theo dõi tiến độ:</strong> Xem và duyệt các báo cáo tiến độ hàng tuần của sinh viên.</li>
                </ul>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="text-primary" />
              Dành cho Quản trị viên
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="prose prose-sm max-w-none text-foreground [&_ul]:list-disc [&_ul]:pl-5">
                <p>Tài khoản Quản trị viên có toàn quyền quản lý hệ thống, bao gồm:</p>
                <ul>
                    <li><strong>Quản lý Đợt báo cáo:</strong> Tạo và cấu hình các đợt đăng ký, báo cáo cho từng học kỳ.</li>
                    <li><strong>Quản lý Người dùng:</strong> Tạo, quản lý và phân quyền cho tất cả các tài khoản (sinh viên, giáo viên, quản trị viên).</li>
                    <li><strong>Quản lý Đề tài và Rubric:</strong> Duyệt các đề tài do giáo viên đề xuất và quản lý các bộ tiêu chí chấm điểm (rubric).</li>
                    <li><strong>Phân công Hội đồng:</strong> Lập hội đồng, tiểu ban và phân công thành viên cho các đợt bảo vệ.</li>
                    <li><strong>Xem báo cáo và thống kê:</strong> Truy cập tất cả các báo cáo và số liệu thống kê toàn hệ thống.</li>
                </ul>
            </div>
          </CardContent>
        </Card>

      </div>
    </main>
  );
}
