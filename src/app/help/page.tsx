
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, UserCheck, Shield, BookMarked, FileSignature, Activity, FileUp, ClipboardList, ClipboardCheck as ClipboardCheckIcon } from "lucide-react";

export default function HelpPage() {
  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Hướng dẫn sử dụng hệ thống CapstoneTrack</CardTitle>
            <CardDescription>
              Chào mừng bạn đến với hệ thống quản lý Đồ án Tốt nghiệp và Thực tập. Dưới đây là hướng dẫn chi tiết cho từng vai trò để bạn có thể bắt đầu.
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
          <CardContent className="space-y-6">
            <div className="prose prose-sm max-w-none text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:text-foreground">
                <p>Là một sinh viên, bạn có thể thực hiện các chức năng chính sau đây từ thanh điều hướng bên trái:</p>
                
                <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold flex items-center gap-2"><BookMarked size={18}/>Đăng ký Đề tài Tốt nghiệp</h4>
                        <ul>
                            <li>Truy cập mục <strong>Đăng ký Đề tài</strong>.</li>
                            <li>Duyệt qua danh sách các đề tài được giáo viên đề xuất trong đợt báo cáo hiện tại.</li>
                            <li>Xem chi tiết đề tài bạn quan tâm (mô tả, mục tiêu, yêu cầu).</li>
                            <li>Nhấn nút <strong>"Đăng ký"</strong> và xác nhận.</li>
                            <li>Sau khi đăng ký, đề tài của bạn sẽ ở trạng thái "Chờ GVHD xác nhận". Bạn cần chờ giáo viên chấp thuận trước khi thực hiện các bước tiếp theo.</li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold flex items-center gap-2"><FileSignature size={18}/>Nộp Thuyết minh & Báo cáo</h4>
                        <ul>
                            <li><strong>Nộp Thuyết minh:</strong> Sau khi đăng ký đề tài được duyệt, vào mục <strong>Nộp Thuyết minh</strong>. Điền đầy đủ các thông tin chi tiết về đề tài và nhấn "Nộp" để gửi cho GVHD duyệt.</li>
                            <li><strong>Nộp Báo cáo:</strong> Khi đến giai đoạn nộp báo cáo cuối kỳ, truy cập mục <strong>Nộp Báo cáo</strong> để gửi link file báo cáo toàn văn của bạn.</li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold flex items-center gap-2"><Activity size={18}/>Báo cáo Tiến độ Hàng tuần</h4>
                        <ul>
                            <li>Truy cập mục <strong>Báo cáo Tiến độ</strong>.</li>
                            <li>Chọn tuần báo cáo tương ứng.</li>
                            <li>Điền thông tin về công việc đã làm, kế hoạch tuần tới và link minh chứng (nếu có).</li>
                            <li>Nhấn "Nộp báo cáo" để gửi cho GVHD xem xét.</li>
                        </ul>
                    </div>

                     <div>
                        <h4 className="font-semibold flex items-center gap-2"><ClipboardList size={18}/>Đăng ký & Nộp hồ sơ Thực tập</h4>
                        <ul>
                            <li><strong>Đăng ký Thực tập:</strong> Vào mục <strong>Đăng ký Thực tập</strong>, chọn hình thức (theo danh sách hoặc tự tìm), điền thông tin và nộp các link tài liệu liên quan (đơn đăng ký, giấy tiếp nhận).</li>
                            <li><strong>Thực tập sớm:</strong> Nếu bạn tham gia chương trình thực tập sớm, hãy vào mục <strong>ĐK Thực tập sớm</strong> và <strong>Báo cáo TT sớm</strong> để quản lý.</li>
                            <li><strong>Nộp hồ sơ:</strong> Khi báo cáo thực tập, truy cập mục <strong>Nộp hồ sơ thực tập</strong> để hoàn tất các thông tin và tài liệu cuối cùng.</li>
                        </ul>
                    </div>
                </div>
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
             <div className="prose prose-sm max-w-none text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:text-foreground">
                <p>Với vai trò là giáo viên, bạn có các quyền chính sau:</p>
                <ul>
                    <li><strong>Quản lý Đề tài của tôi:</strong> Truy cập mục <strong>Đề tài của tôi</strong> để đề xuất, chỉnh sửa và quản lý các đề tài tốt nghiệp bạn muốn hướng dẫn. Các đề tài mới sẽ cần admin duyệt.</li>
                    <li><strong>Duyệt đăng ký của sinh viên:</strong> Trong mục <strong>Đề tài của tôi</strong>, nhấn vào số lượng sinh viên đăng ký ở mỗi đề tài để xem danh sách và nhấn "Chấp nhận" hoặc "Từ chối".</li>
                    <li><strong>Duyệt thuyết minh và báo cáo:</strong> Khi sinh viên nộp, bạn sẽ có thể truy cập từ danh sách sinh viên đã đăng ký (trong mục "Đề tài của tôi") để xem, góp ý và duyệt.</li>
                    <li><strong>Theo dõi tiến độ:</strong> Xem và duyệt các báo cáo tiến độ hàng tuần của sinh viên trong chi tiết đề tài.</li>
                    <li><strong>Chấm điểm:</strong>
                        <ul>
                            <li><strong>Chấm điểm Hướng dẫn:</strong> Truy cập <strong>Chấm điểm Hướng dẫn</strong> để cho điểm quá trình của sinh viên bạn hướng dẫn.</li>
                            <li><strong className="flex items-center gap-2"><ClipboardCheckIcon size={16}/>Chấm điểm Hội đồng:</strong> Khi được phân công làm thành viên hội đồng, truy cập mục <strong>Chấm điểm Hội đồng</strong>. Hệ thống sẽ hiển thị các tiểu ban bạn tham gia. Nhấn vào từng tiểu ban để xem danh sách đề tài/sinh viên và nhấn nút "Chấm điểm" để mở phiếu chấm.</li>
                        </ul>
                    </li>
                    <li><strong>Hướng dẫn Thực tập sớm:</strong> Quản lý và ghi nhận tiến độ cho các sinh viên bạn hướng dẫn trong chương trình thực tập sớm tại mục <strong>Hướng dẫn TT sớm</strong>.</li>
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
             <div className="prose prose-sm max-w-none text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:text-foreground">
                <p>Tài khoản Quản trị viên có toàn quyền quản lý hệ thống, bao gồm các chức năng chính trong mục "Quản lý chung":</p>
                <ul>
                    <li><strong>Quản lý Đợt báo cáo:</strong> Tạo, cấu hình (gán rubric, tỷ trọng điểm) và quản lý trạng thái các đợt đăng ký, báo cáo cho từng học kỳ.</li>
                    <li><strong>Quản lý Sinh viên/GVHD/Tài khoản:</strong> Tạo, quản lý, xếp lớp, và phân quyền cho tất cả các tài khoản. Có thể nhập hàng loạt từ file Excel.</li>
                    <li><strong>Quản lý Đề tài:</strong> Duyệt hoặc từ chối các đề tài do giáo viên đề xuất.</li>
                    <li><strong>Quản lý Rubric:</strong> Tạo và chỉnh sửa các bộ tiêu chí chấm điểm (rubric) cho toàn hệ thống.</li>
                    <li><strong>Phân công Hội đồng:</strong> Trong chi tiết mỗi đợt báo cáo, vào "Quản lý Hội đồng" để lập hội đồng, tiểu ban và phân công thành viên.</li>
                    <li><strong>Xem báo cáo và thống kê:</strong> Truy cập <strong>Bảng điểm</strong> và <strong>Hồ sơ đã nộp</strong> để xem, lọc và xuất tất cả dữ liệu.</li>
                    <li><strong>Cài đặt hệ thống:</strong> Bật/tắt các tính năng như cho phép sinh viên đăng ký, cho phép sửa thuyết minh đã duyệt, v.v.</li>
                </ul>
            </div>
          </CardContent>
        </Card>

      </div>
    </main>
  );
}
