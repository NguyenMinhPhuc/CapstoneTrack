

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, UserCheck, Shield, BookMarked, FileSignature, Activity, FileUp, ClipboardList, ClipboardCheck as ClipboardCheckIcon, Repeat, Clock, BookText, UserPlus } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function HelpPage() {
  const [isEarlyInternshipOpen, setIsEarlyInternshipOpen] = useState(true);
  const [isChangeTopicOpen, setIsChangeTopicOpen] = useState(true);
  const [isTopicManagementOpen, setIsTopicManagementOpen] = useState(true);
  const [isGradingOpen, setIsGradingOpen] = useState(true);
  const [isAddStudentsOpen, setIsAddStudentsOpen] = useState(true);


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

        <Collapsible asChild open={isTopicManagementOpen} onOpenChange={setIsTopicManagementOpen}>
            <Card>
                <CardHeader>
                    <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-left">
                                <BookText className="text-primary" />
                                Quy trình Quản lý Đề tài
                            </CardTitle>
                            <ChevronDown className={`h-5 w-5 transition-transform ${isTopicManagementOpen ? 'rotate-180' : ''}`} />
                        </div>
                         <CardDescription className="text-left mt-2">
                            Các bước từ khi GVHD đề xuất đề tài, Admin duyệt, cho đến khi Sinh viên đăng ký thực hiện.
                        </CardDescription>
                    </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                    <CardContent className="space-y-6 pt-0">
                         <div className="prose prose-sm max-w-none text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_h4]:font-semibold [&_strong]:text-foreground [&_h5]:font-semibold [&_h5]:mt-4">
                            <h4>1. GVHD Đề xuất Đề tài</h4>
                            <p>Mục tiêu: Giáo viên tạo và gửi đề tài mới lên hệ thống để chờ duyệt.</p>
                            <ol className="list-decimal pl-5 mt-1">
                                <li><strong>Truy cập trang quản lý:</strong>
                                    <ul>
                                        <li>GVHD vào mục <strong>"Đề tài của tôi"</strong> trên thanh menu.</li>
                                    </ul>
                                </li>
                                <li><strong>Tạo đề tài mới:</strong>
                                    <ul>
                                        <li>Nhấn nút <strong>"Thêm Đề tài mới"</strong>.</li>
                                        <li>Điền đầy đủ các thông tin bắt buộc: Tên đề tài, đợt báo cáo, mô tả, số lượng SV...</li>
                                    </ul>
                                </li>
                                <li><strong>Gửi duyệt:</strong>
                                     <ul>
                                        <li>Sau khi điền xong, nhấn nút <strong>"Gửi duyệt"</strong>.</li>
                                        <li>Đề tài mới tạo sẽ có trạng thái là <strong>"Chờ duyệt"</strong>.</li>
                                    </ul>
                                </li>
                            </ol>

                            <hr className="my-6"/>

                            <h4>2. Admin Duyệt Đề tài</h4>
                             <p>Mục tiêu: Admin xem xét và quyết định có chấp thuận đề tài do GVHD đề xuất hay không.</p>
                             <ol className="list-decimal pl-5 mt-1">
                                <li><strong>Truy cập trang quản lý:</strong>
                                    <ul>
                                        <li>Admin vào <strong>Quản lý chung</strong> → <strong>"Quản lý Đề tài"</strong>.</li>
                                    </ul>
                                </li>
                                <li><strong>Xem danh sách chờ duyệt:</strong>
                                     <ul>
                                        <li>Hệ thống sẽ hiển thị tất cả các đề tài đang ở trạng thái <strong>"Chờ duyệt"</strong>.</li>
                                    </ul>
                                </li>
                                <li><strong>Phê duyệt hoặc Từ chối:</strong>
                                     <ul>
                                        <li><strong>Để phê duyệt:</strong> Nhấn vào menu "..." ở cuối hàng và chọn <strong>"Thay đổi trạng thái"</strong> → <strong>"Đã duyệt"</strong>.</li>
                                        <li><strong>Để từ chối:</strong> Chọn <strong>"Thay đổi trạng thái"</strong> → <strong>"Bị từ chối"</strong> và nhập lý do.</li>
                                    </ul>
                                </li>
                            </ol>
                            
                             <hr className="my-6"/>

                            <h4>3. Sinh viên Đăng ký Đề tài</h4>
                            <p>Mục tiêu: Sinh viên tìm kiếm và đăng ký vào một đề tài đã được duyệt.</p>
                            <ol className="list-decimal pl-5 mt-1">
                                <li><strong>Truy cập trang đăng ký:</strong>
                                    <ul>
                                        <li>SV vào mục <strong>"Đăng ký Đề tài"</strong> trên thanh menu.</li>
                                    </ul>
                                </li>
                                <li><strong>Tìm và chọn đề tài:</strong>
                                     <ul>
                                        <li>Hệ thống sẽ hiển thị danh sách các đề tài đã được duyệt và còn chỗ trống.</li>
                                    </ul>
                                </li>
                                 <li><strong>Thực hiện đăng ký:</strong>
                                     <ul>
                                        <li>Nhấn nút <strong>"Đăng ký"</strong> ở đề tài mong muốn.</li>
                                        <li>Trạng thái đăng ký sẽ là <strong>"Chờ GVHD xác nhận"</strong>.</li>
                                    </ul>
                                </li>
                            </ol>
                             <hr className="my-6"/>
                            <h4>4. GVHD Xác nhận Đăng ký của Sinh viên</h4>
                            <p>Mục tiêu: GVHD xác nhận sinh viên nào sẽ được thực hiện đề tài mình hướng dẫn.</p>
                             <ol className="list-decimal pl-5 mt-1">
                                <li><strong>Xem danh sách đăng ký:</strong>
                                    <ul>
                                        <li>GVHD vào lại mục <strong>"Đề tài của tôi"</strong>, nhấn vào số lượng SV ở đề tài tương ứng.</li>
                                    </ul>
                                </li>
                                 <li><strong>Chấp nhận hoặc Từ chối:</strong>
                                    <ul>
                                        <li>Nhấn nút <strong>"Chấp nhận"</strong> để đồng ý. Trạng thái đăng ký của SV sẽ chuyển thành <strong>"Đã được xác nhận"</strong>.</li>
                                        <li>Hoặc nhấn <strong>"Từ chối"</strong>.</li>
                                    </ul>
                                </li>
                            </ol>
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
        
        <Collapsible asChild open={isGradingOpen} onOpenChange={setIsGradingOpen}>
            <Card>
                <CardHeader>
                    <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-left">
                                <ClipboardCheckIcon className="text-primary" />
                                Quy trình Chấm điểm
                            </CardTitle>
                            <ChevronDown className={`h-5 w-5 transition-transform ${isGradingOpen ? 'rotate-180' : ''}`} />
                        </div>
                         <CardDescription className="text-left mt-2">
                            Các bước để GVHD và thành viên Hội đồng thực hiện việc chấm điểm cho sinh viên.
                        </CardDescription>
                    </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                    <CardContent className="space-y-6 pt-0">
                         <div className="prose prose-sm max-w-none text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_h4]:font-semibold [&_strong]:text-foreground [&_h5]:font-semibold [&_h5]:mt-4">
                            <h4>1. Dành cho Giáo viên Hướng dẫn</h4>
                            <p>Mục tiêu: GVHD cho điểm quá trình hướng dẫn đối với các sinh viên mình phụ trách.</p>
                            <ol className="list-decimal pl-5 mt-1">
                                <li><strong>Truy cập trang Chấm điểm:</strong>
                                    <ul>
                                        <li>GVHD vào mục <strong>"Chấm điểm Hướng dẫn"</strong> trên thanh menu.</li>
                                        <li>Hệ thống sẽ liệt kê các đợt báo cáo đang diễn ra.</li>
                                    </ul>
                                </li>
                                <li><strong>Chọn sinh viên/đề tài:</strong>
                                    <ul>
                                        <li>GVHD nhấn vào một đợt báo cáo để mở rộng danh sách các sinh viên/đề tài mình đang hướng dẫn.</li>
                                    </ul>
                                </li>
                                <li><strong>Thực hiện Chấm điểm:</strong>
                                     <ul>
                                        <li>Tại dòng của sinh viên hoặc nhóm sinh viên cần chấm, nhấn nút <strong>"Chấm điểm"</strong>.</li>
                                        <li>Một cửa sổ (dialog) chứa phiếu chấm điểm sẽ hiện ra.</li>
                                        <li>GVHD điền điểm cho từng tiêu chí và có thể thêm nhận xét.</li>
                                        <li>Nhấn <strong>"Lưu điểm"</strong> để hoàn tất.</li>
                                    </ul>
                                </li>
                            </ol>

                            <hr className="my-6"/>

                            <h4>2. Dành cho thành viên Hội đồng</h4>
                             <p>Mục tiêu: Thành viên HĐ chấm điểm cho các đề tài được phân công trong các tiểu ban.</p>
                             <ol className="list-decimal pl-5 mt-1">
                                <li><strong>Truy cập trang Chấm điểm:</strong>
                                    <ul>
                                        <li>Giáo viên được phân công vào hội đồng truy cập mục <strong>"Chấm điểm Hội đồng"</strong> trên thanh menu.</li>
                                        <li>Hệ thống sẽ hiển thị danh sách các đợt báo cáo và các tiểu ban mà giáo viên đó là thành viên.</li>
                                    </ul>
                                </li>
                                <li><strong>Chọn Tiểu ban:</strong>
                                     <ul>
                                        <li>Nhấn vào một tiểu ban để xem danh sách các đề tài/sinh viên được phân công bảo vệ tại tiểu ban đó.</li>
                                    </ul>
                                </li>
                                <li><strong>Thực hiện Chấm điểm:</strong>
                                     <ul>
                                        <li>Tại dòng của đề tài/sinh viên cần chấm, nhấn nút <strong>"Chấm điểm"</strong>.</li>
                                        <li>Phiếu chấm điểm (dựa trên rubric đã được Admin gán) sẽ hiện ra.</li>
                                        <li>Thành viên HĐ điền điểm cho từng tiêu chí và thêm nhận xét.</li>
                                        <li>Nhấn <strong>"Lưu điểm"</strong> để hoàn tất.</li>
                                    </ul>
                                </li>
                                <li><strong>Sao chép điểm (Tùy chọn):</strong>
                                     <ul>
                                        <li>Để tiết kiệm thời gian, tại trang chi tiết đợt báo cáo, admin có thể nhấn vào menu "..." ở cuối hàng của sinh viên và chọn "Sao chép điểm hội đồng".</li>
                                        <li>Chọn nguồn (ai đã chấm) và đích (ai sẽ nhận điểm sao chép) rồi xác nhận.</li>
                                    </ul>
                                </li>
                            </ol>
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
        
        <Collapsible asChild open={isEarlyInternshipOpen} onOpenChange={setIsEarlyInternshipOpen}>
            <Card>
                <CardHeader>
                    <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-left">
                                <Clock className="text-primary" />
                                Quy trình Thực tập sớm
                            </CardTitle>
                            <ChevronDown className={`h-5 w-5 transition-transform ${isEarlyInternshipOpen ? 'rotate-180' : ''}`} />
                        </div>
                         <CardDescription className="text-left mt-2">
                            Các bước từ khi thiết lập, đăng ký, thực hiện, cho đến khi hoàn thành chương trình thực tập sớm.
                        </CardDescription>
                    </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                    <CardContent className="space-y-6 pt-0">
                         <div className="prose prose-sm max-w-none text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_h4]:font-semibold [&_strong]:text-foreground [&_h5]:font-semibold [&_h5]:mt-4">
                            <h4>1. Thiết lập ban đầu (Admin)</h4>
                            <p>Mục tiêu: Chuẩn bị môi trường và dữ liệu cần thiết để chương trình thực tập sớm có thể vận hành.</p>
                            <ol className="list-decimal pl-5 mt-1">
                                <li><strong>Quản lý Phòng ban LHU:</strong>
                                    <ul>
                                        <li>Truy cập <strong>Quản lý chung</strong> → <strong>Quản lý Doanh nghiệp</strong>.</li>
                                        <li>Admin tạo hoặc cập nhật thông tin các phòng ban, trung tâm, viện nghiên cứu... thuộc Trường Đại học Lạc Hồng sẽ tiếp nhận sinh viên thực tập sớm.</li>
                                        <li><strong>Quan trọng:</strong> Khi tạo hoặc sửa, cần phải tick vào ô <strong>"Đây là phòng ban của LHU?"</strong>.</li>
                                    </ul>
                                </li>
                                <li><strong>Gán Người phụ trách (GVHD):</strong>
                                    <ul>
                                        <li>Đối với mỗi phòng ban của LHU, Admin cần chỉ định một giáo viên làm người phụ trách (người hướng dẫn mặc định).</li>
                                        <li>Thông tin này được thiết lập trong form thêm/sửa doanh nghiệp.</li>
                                    </ul>
                                </li>
                                <li><strong>Cài đặt số giờ mục tiêu:</strong>
                                    <ul>
                                        <li>Truy cập <strong>Quản lý chung</strong> → <strong>Cài đặt hệ thống</strong>.</li>
                                        <li>Trong mục "Cài đặt Thực tập sớm", nhập <strong>Số giờ mục tiêu</strong> mà sinh viên cần hoàn thành. Ví dụ: 700 giờ.</li>
                                    </ul>
                                </li>
                            </ol>
                            
                            <hr className="my-6"/>

                            <h4>2. Sinh viên Đăng ký</h4>
                             <p>Mục tiêu: Sinh viên gửi đơn đăng ký tham gia thực tập sớm tại một phòng ban đã được thiết lập.</p>
                             <ol className="list-decimal pl-5 mt-1">
                                <li><strong>Tạo đơn đăng ký:</strong>
                                    <ul>
                                        <li>SV truy cập mục <strong>Thực tập</strong> → <strong>ĐK Thực tập sớm</strong> trên menu.</li>
                                        <li>Nhấn nút "Tạo Đơn đăng ký mới".</li>
                                    </ul>
                                </li>
                                <li><strong>Điền thông tin:</strong>
                                     <ul>
                                        <li>SV chọn phòng ban muốn đăng ký từ danh sách. Thông tin người hướng dẫn sẽ được tự động điền.</li>
                                        <li>SV chọn ngày bắt đầu và có thể nộp link minh chứng (nếu có).</li>
                                        <li>Sau khi nộp, đơn đăng ký sẽ ở trạng thái <strong>"Chờ duyệt"</strong>.</li>
                                    </ul>
                                </li>
                            </ol>
                            
                             <hr className="my-6"/>

                            <h4>3. GVHD Duyệt Đăng ký</h4>
                            <p>Mục tiêu: GVHD xem xét và xác nhận đơn đăng ký của sinh viên.</p>
                            <ol className="list-decimal pl-5 mt-1">
                                <li><strong>Xem danh sách chờ duyệt:</strong>
                                    <ul>
                                        <li>GVHD truy cập mục <strong>Hướng dẫn TT sớm</strong> trên menu.</li>
                                        <li>Hệ thống sẽ hiển thị danh sách các sinh viên đã gửi yêu cầu đăng ký với trạng thái <strong>"Chờ duyệt"</strong>.</li>
                                    </ul>
                                </li>
                                <li><strong>Phê duyệt hoặc Từ chối:</strong>
                                     <ul>
                                        <li>GVHD nhấn nút <strong>"Duyệt"</strong> để chấp nhận. Trạng thái của sinh viên sẽ chuyển thành <strong>"Đang thực tập"</strong>.</li>
                                        <li>Hoặc nhấn <strong>"Từ chối"</strong> và nhập lý do. Trạng thái sẽ chuyển thành <strong>"Bị từ chối"</strong>.</li>
                                    </ul>
                                </li>
                            </ol>

                             <hr className="my-6"/>

                            <h4>4. Quá trình Thực tập và Báo cáo</h4>
                            <p>Mục tiêu: Sinh viên báo cáo tiến độ hàng tuần và GVHD theo dõi, ghi nhận.</p>
                            <h5>Dành cho Sinh viên:</h5>
                             <ol className="list-decimal pl-5 mt-1">
                                <li><strong>Nộp báo cáo:</strong>
                                    <ul>
                                        <li>SV truy cập mục <strong>Thực tập</strong> → <strong>Báo cáo TT sớm</strong>.</li>
                                        <li>Chọn tuần cần báo cáo, điền nội dung công việc đã làm, kế hoạch tuần tới và link minh chứng (nếu có).</li>
                                        <li>Nhấn "Nộp báo cáo". Báo cáo sẽ ở trạng thái <strong>"Chờ duyệt"</strong>.</li>
                                    </ul>
                                </li>
                            </ol>
                            <h5>Dành cho GVHD:</h5>
                             <ol className="list-decimal pl-5 mt-1">
                                <li><strong>Theo dõi tiến độ:</strong>
                                    <ul>
                                        <li>GVHD truy cập mục <strong>Hướng dẫn TT sớm</strong>.</li>
                                        <li>Nhấn vào menu "..." ở cuối hàng của sinh viên và chọn <strong>"Xem tiến độ"</strong>.</li>
                                    </ul>
                                </li>
                                <li><strong>Duyệt báo cáo tuần:</strong>
                                     <ul>
                                        <li>Trong cửa sổ tiến độ, GVHD sẽ thấy các báo cáo sinh viên đã nộp.</li>
                                        <li>GVHD xem xét nội dung và nhập <strong>số giờ được duyệt</strong> cho tuần đó.</li>
                                        <li>Nhấn <strong>"Duyệt"</strong> để xác nhận hoặc <strong>"Yêu cầu sửa"</strong> (kèm nhận xét) nếu báo cáo chưa đạt.</li>
                                    </ul>
                                </li>
                                 <li><strong>Tạo báo cáo thay sinh viên (nếu cần):</strong>
                                     <ul>
                                        <li>Trong trường hợp sinh viên không nộp báo cáo, GVHD có thể chủ động tạo báo cáo và ghi nhận số giờ cho tuần đó trong cửa sổ "Tiến độ".</li>
                                    </ul>
                                </li>
                            </ol>
                            
                             <hr className="my-6"/>

                            <h4>5. Hoàn thành Chương trình</h4>
                            <p>Mục tiêu: Kết thúc quá trình thực tập sớm và chuyển trạng thái cho sinh viên.</p>
                            <ol className="list-decimal pl-5 mt-1">
                                <li><strong>Kiểm tra tổng số giờ:</strong>
                                    <ul>
                                        <li>GVHD theo dõi tổng số giờ đã duyệt của sinh viên trong mục <strong>"Hướng dẫn TT sớm"</strong>.</li>
                                    </ul>
                                </li>
                                <li><strong>Đánh dấu Hoàn thành:</strong>
                                     <ul>
                                        <li>Khi sinh viên đã tích lũy đủ số giờ mục tiêu, GVHD nhấn vào menu "..." và chọn <strong>"Đánh dấu Hoàn thành"</strong>.</li>
                                        <li>Trạng thái thực tập sớm của sinh viên sẽ chuyển thành <strong>"Hoàn thành"</strong>.</li>
                                    </ul>
                                </li>
                                <li><strong>Chuyển sang Báo cáo Thực tập chính thức:</strong>
                                     <ul>
                                        <li>Khi sinh viên được đánh dấu "Hoàn thành", họ có thể truy cập mục <strong>Đăng ký Thực tập</strong> trong đợt báo cáo chính thức.</li>
                                        <li>Hệ thống sẽ cho phép họ chọn hình thức <strong>"Đăng ký từ Thực tập sớm"</strong>, tự động điền các thông tin đã có để chuẩn bị cho bước báo cáo trước hội đồng.</li>
                                    </ul>
                                </li>
                            </ol>
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
        
         <Collapsible asChild open={isAddStudentsOpen} onOpenChange={setIsAddStudentsOpen}>
            <Card>
                <CardHeader>
                    <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-left">
                                <UserPlus className="text-primary" />
                                Quy trình Thêm Sinh viên
                            </CardTitle>
                            <ChevronDown className={`h-5 w-5 transition-transform ${isAddStudentsOpen ? 'rotate-180' : ''}`} />
                        </div>
                         <CardDescription className="text-left mt-2">
                            Các cách khác nhau để Quản trị viên (Admin) có thể thêm sinh viên vào một đợt báo cáo cụ thể trong hệ thống.
                        </CardDescription>
                    </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                    <CardContent className="space-y-6 pt-0">
                         <div className="prose prose-sm max-w-none text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_h4]:font-semibold [&_strong]:text-foreground [&_h5]:font-semibold [&_h5]:mt-4">
                            <h4>1. Thêm thủ công từng sinh viên</h4>
                            <p>Cách này phù hợp khi cần thêm lẻ một vài sinh viên.</p>
                            <ol className="list-decimal pl-5 mt-1">
                                <li><strong>Truy cập chi tiết Đợt báo cáo:</strong>
                                    <ul>
                                        <li>Từ menu, vào <strong>Quản lý chung</strong> → <strong>Quản lý Đợt báo cáo</strong>.</li>
                                        <li>Nhấn vào tên đợt báo cáo bạn muốn thêm sinh viên.</li>
                                    </ul>
                                </li>
                                <li><strong>Thêm sinh viên:</strong>
                                    <ul>
                                        <li>Tại trang chi tiết, nhấn vào nút <strong>"Thêm Sinh viên"</strong>.</li>
                                        <li>Một cửa sổ sẽ hiện ra. Tìm kiếm sinh viên theo MSSV hoặc tên.</li>
                                        <li>Bạn có thể tùy chọn nhập tên đề tài và chọn GVHD ngay lúc này (hoặc để trống và cập nhật sau).</li>
                                        <li>Nhấn nút "Thêm sinh viên" để hoàn tất.</li>
                                    </ul>
                                </li>
                            </ol>

                            <hr className="my-6"/>

                            <h4>2. Thêm hàng loạt theo lớp</h4>
                            <p>Cách này hiệu quả khi cần thêm toàn bộ hoặc phần lớn sinh viên của một lớp vào đợt báo cáo.</p>
                             <ol className="list-decimal pl-5 mt-1">
                                <li><strong>Truy cập chi tiết Đợt báo cáo.</strong></li>
                                <li><strong>Mở chức năng thêm theo lớp:</strong>
                                    <ul>
                                        <li>Nhấn vào nút <strong>"Thêm theo lớp"</strong>.</li>
                                    </ul>
                                </li>
                                <li><strong>Chọn lớp và sinh viên:</strong>
                                     <ul>
                                        <li>Chọn lớp từ danh sách thả xuống.</li>
                                        <li>Hệ thống sẽ liệt kê tất cả sinh viên thuộc lớp đó (những sinh viên đã có trong đợt sẽ không hiển thị).</li>
                                        <li>Bạn có thể tick vào ô <strong>"Chọn tất cả"</strong> hoặc chọn từng sinh viên riêng lẻ.</li>
                                        <li>Nhấn nút "Thêm ... sinh viên" để xác nhận.</li>
                                    </ul>
                                </li>
                            </ol>
                            
                             <hr className="my-6"/>

                            <h4>3. Nhập từ file Excel</h4>
                            <p>Phương pháp này phù hợp để đăng ký nhanh thông tin đề tài và GVHD cho hàng loạt sinh viên cùng lúc.</p>
                            <ol className="list-decimal pl-5 mt-1">
                                <li><strong>Chuẩn bị file Excel:</strong>
                                    <ul>
                                        <li>File cần có các cột tối thiểu là <strong>`StudentID`</strong> (hoặc <strong>`Mã SV`</strong>).</li>
                                        <li>Các cột tùy chọn khác có thể bao gồm <strong>`ProjectTitle`</strong> (`Tên đề tài`) và <strong>`SupervisorName`</strong> (`GVHD`). Tên GVHD phải khớp với tên đã đăng ký trong hệ thống.</li>
                                    </ul>
                                </li>
                                <li><strong>Truy cập chi tiết Đợt báo cáo.</strong></li>
                                <li><strong>Mở chức năng nhập liệu:</strong>
                                    <ul>
                                        <li>Nhấn vào nút <strong>"Thêm sinh viên"</strong> → Chọn <strong>"Nhập từ Excel"</strong> (hoặc một nút riêng tùy giao diện).</li>
                                        <li>Tải file Excel đã chuẩn bị lên.</li>
                                        <li>Hệ thống sẽ đọc dữ liệu và thêm các sinh viên tương ứng vào đợt báo cáo, đồng thời gán luôn thông tin đề tài và GVHD nếu có.</li>
                                    </ul>
                                </li>
                            </ol>
                            
                            <hr className="my-6"/>
                            
                            <h4>4. Thêm từ trang Quản lý Sinh viên</h4>
                            <p>Cách này linh hoạt, cho phép bạn lọc sinh viên theo nhiều tiêu chí trước khi thêm.</p>
                            <ol className="list-decimal pl-5 mt-1">
                                <li><strong>Truy cập trang Quản lý Sinh viên:</strong>
                                    <ul>
                                        <li>Từ menu, vào <strong>Quản lý chung</strong> → <strong>Quản lý Sinh viên</strong>.</li>
                                    </ul>
                                </li>
                                <li><strong>Chọn sinh viên:</strong>
                                    <ul>
                                        <li>Sử dụng các bộ lọc (khóa, lớp...) và thanh tìm kiếm để tìm sinh viên.</li>
                                        <li>Tick vào ô vuông ở đầu mỗi hàng để chọn một hoặc nhiều sinh viên.</li>
                                    </ul>
                                </li>
                                 <li><strong>Thực hiện hành động:</strong>
                                    <ul>
                                        <li>Một menu hành động sẽ xuất hiện. Nhấn vào nút <strong>"Thêm vào đợt"</strong>.</li>
                                        <li>Chọn đợt báo cáo bạn muốn thêm các sinh viên này vào từ danh sách.</li>
                                        <li>Nhấn "Xác nhận" để hoàn tất.</li>
                                    </ul>
                                </li>
                            </ol>
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>

        <Collapsible asChild open={isChangeTopicOpen} onOpenChange={setIsChangeTopicOpen}>
          <Card>
            <CardHeader>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-left">
                    <Repeat className="text-primary" />
                    Quy trình Thay đổi Đề tài hoặc GVHD
                  </CardTitle>
                  <ChevronDown className={`h-5 w-5 transition-transform ${isChangeTopicOpen ? 'rotate-180' : ''}`} />
                </div>
                 <CardDescription className="text-left mt-2">
                    Các bước cần thực hiện khi một sinh viên muốn thay đổi đề tài tốt nghiệp hoặc giáo viên hướng dẫn (GVHD) đã đăng ký.
                </CardDescription>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
                <CardContent className="space-y-6 pt-0">
                  <div className="prose prose-sm max-w-none text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_h4]:font-semibold [&_strong]:text-foreground">
                      <h4>Kịch bản 1: Sinh viên đã đăng ký nhưng chưa được GVHD duyệt</h4>
                      <p>Đây là trường hợp đơn giản nhất, khi trạng thái đăng ký của sinh viên đang là <strong>"Chờ GVHD xác nhận"</strong>.</p>
                      <ul>
                          <li><strong>Sinh viên:</strong>
                              <ol className="list-decimal pl-5 mt-1">
                                  <li>Truy cập mục <strong>"Đăng ký Đề tài"</strong> trên thanh điều hướng.</li>
                                  <li>Tại đề tài đang đăng ký, nhấn vào nút <strong>"Hủy đăng ký"</strong>.</li>
                                  <li>Hệ thống sẽ xác nhận và đưa sinh viên trở lại trạng thái chưa đăng ký.</li>
                                  <li>Sinh viên có thể duyệt và chọn một đề tài mới hoặc một GVHD khác từ danh sách và tiến hành đăng ký lại.</li>
                              </ol>
                          </li>
                          <li><strong>Giáo viên Hướng dẫn (GVHD):</strong> Không cần hành động gì. Yêu cầu đăng ký ban đầu sẽ tự động biến mất khỏi danh sách chờ của họ.</li>
                          <li><strong>Quản trị viên (Admin):</strong> Không cần hành động gì.</li>
                      </ul>

                      <hr className="my-6"/>

                      <h4>Kịch bản 2: Sinh viên đã được GVHD duyệt đăng ký</h4>
                      <p>Khi trạng thái đăng ký là <strong>"Đã được xác nhận"</strong>, sinh viên không thể tự ý hủy. Việc thay đổi cần có sự can thiệp của GVHD hoặc Admin.</p>
                      
                      <h5 className="font-semibold mt-4">Cách 1: GVHD chủ động hủy đăng ký (Khuyến khích)</h5>
                      <ul>
                          <li><strong>Sinh viên:</strong> Liên hệ trực tiếp với GVHD hiện tại (qua Zalo, email...) để trình bày nguyện vọng muốn đổi đề tài hoặc GVHD.</li>
                          <li><strong>Giáo viên Hướng dẫn (GVHD):</strong>
                              <ol className="list-decimal pl-5 mt-1">
                                  <li>Truy cập mục <strong>"Đề tài của tôi"</strong>.</li>
                                  <li>Tìm đến đề tài có sinh viên cần thay đổi.</li>
                                  <li>Nhấn vào số lượng sinh viên đã đăng ký để mở danh sách chi tiết.</li>
                                  <li>Tại dòng của sinh viên tương ứng, nhấn nút <strong>"Hủy ĐK"</strong>.</li>
                                  <li>Hệ thống sẽ gỡ sinh viên khỏi đề tài. Đề tài sẽ được mở lại một suất đăng ký.</li>
                              </ol>
                          </li>
                          <li><strong>Sinh viên (sau khi GVHD đã hủy):</strong> Tải lại trang <strong>"Đăng ký Đề tài"</strong>. Sinh viên sẽ thấy mình đã có thể đăng ký một đề tài mới.</li>
                      </ul>

                      <h5 className="font-semibold mt-4">Cách 2: Admin can thiệp trực tiếp</h5>
                      <p>Trường hợp này được sử dụng khi không thể liên hệ được với GVHD hoặc cần xử lý nhanh.</p>
                      <ul>
                          <li><strong>Sinh viên:</strong> Liên hệ với Admin của khoa (thường là giáo vụ) để yêu cầu được gỡ khỏi đề tài hiện tại.</li>
                          <li><strong>Quản trị viên (Admin):</strong>
                              <ol className="list-decimal pl-5 mt-1">
                                  <li>Truy cập <strong>"Quản lý chung"</strong> {"->"} <strong>"Quản lý Đợt báo cáo"</strong>.</li>
                                  <li>Nhấn vào đợt báo cáo tương ứng để vào trang chi tiết.</li>
                                  <li>Trong bảng "Danh sách Sinh viên đăng ký", tìm đến sinh viên cần xử lý.</li>
                                  <li>Nhấn vào menu "..." ở cuối hàng và chọn <strong>"Sửa"</strong>.</li>
                                  <li>Trong hộp thoại hiện ra, xóa trống các trường <strong>"Tên đề tài"</strong> và <strong>"Giáo viên hướng dẫn"</strong>, sau đó nhấn "Lưu thay đổi".</li>
                              </ol>
                          </li>
                      </ul>
                      <hr className="my-6"/>
                      <h4>Tóm tắt luồng khuyến nghị:</h4>
                      <ol className="list-decimal pl-5">
                          <li><strong>Sinh viên tự hủy</strong> nếu đăng ký chưa được duyệt.</li>
                          <li>Nếu đã được duyệt, <strong>sinh viên liên hệ GVHD</strong> để nhờ hủy đăng ký.</li>
                          <li>Chỉ trong trường hợp khẩn cấp, <strong>sinh viên mới liên hệ Admin</strong> để can thiệp.</li>
                      </ol>
                  </div>
                </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

      </div>
    </main>
  );
}
