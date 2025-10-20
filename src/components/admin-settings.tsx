

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDoc, useFirestore, useMemoFirebase, FirestorePermissionError, errorEmitter } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { SystemSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';

export function AdminSettings() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const settingsDocRef = useMemoFirebase(() => doc(firestore, 'systemSettings', 'features'), [firestore]);
    const { data: settings, isLoading } = useDoc<SystemSettings>(settingsDocRef);

    const handleFeatureToggle = async (feature: keyof Omit<SystemSettings, 'id'>, enabled: boolean) => {
        const updateData = { [feature]: enabled };
        setDoc(settingsDocRef, updateData, { merge: true })
            .then(() => {
                 toast({
                    title: 'Thành công',
                    description: 'Cài đặt đã được cập nhật.',
                });
            })
            .catch(error => {
                const contextualError = new FirestorePermissionError({
                    path: settingsDocRef.path,
                    operation: 'update',
                    requestResourceData: updateData,
                });
                errorEmitter.emit('permission-error', contextualError);
            });
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        );
    }
    
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Cài đặt chung</CardTitle>
                    <CardDescription>
                        Bật hoặc tắt các tính năng của hệ thống.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="registration-switch" className="text-base">
                                Cho phép sinh viên đăng ký
                            </Label>
                             <p className="text-sm text-muted-foreground">
                                Nếu tắt, trang đăng ký sẽ bị khóa đối với người dùng mới.
                            </p>
                        </div>
                        <Switch
                            id="registration-switch"
                            checked={settings?.allowStudentRegistration ?? true} // Default to true if undefined
                            onCheckedChange={(checked) => handleFeatureToggle('allowStudentRegistration', checked)}
                        />
                    </div>
                     <Separator />
                    <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="overall-grading-switch" className="text-base">
                                Bật chế độ "Chấm điểm tổng"
                            </Label>
                             <p className="text-sm text-muted-foreground">
                                Cho phép người chấm nhập điểm tổng và để hệ thống tự động phân bổ vào các tiêu chí.
                            </p>
                        </div>
                        <Switch
                            id="overall-grading-switch"
                            checked={settings?.enableOverallGrading ?? false}
                            onCheckedChange={(checked) => handleFeatureToggle('enableOverallGrading', checked)}
                        />
                    </div>
                     <Separator />
                     <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="edit-proposal-switch" className="text-base">
                                Cho phép sửa thuyết minh đã duyệt
                            </Label>
                             <p className="text-sm text-muted-foreground">
                                Nếu bật, sinh viên có thể chỉnh sửa lại bản thuyết minh đã được GVHD duyệt trước đó.
                            </p>
                        </div>
                        <Switch
                            id="edit-proposal-switch"
                            checked={settings?.allowEditingApprovedProposal ?? false}
                            onCheckedChange={(checked) => handleFeatureToggle('allowEditingApprovedProposal', checked)}
                        />
                    </div>
                     <Separator />
                     <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="report-submission-switch" className="text-base">
                                Mở cổng nộp báo cáo
                            </Label>
                             <p className="text-sm text-muted-foreground">
                                Nếu bật, sinh viên có thể nộp báo cáo cuối kỳ bất cứ lúc nào, bỏ qua giới hạn thời gian mặc định.
                            </p>
                        </div>
                        <Switch
                            id="report-submission-switch"
                            checked={settings?.forceOpenReportSubmission ?? false}
                            onCheckedChange={(checked) => handleFeatureToggle('forceOpenReportSubmission', checked)}
                        />
                    </div>
                    <Separator />
                     <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="require-report-approval-switch" className="text-base">
                                Yêu cầu GVHD duyệt báo cáo cuối kỳ
                            </Label>
                             <p className="text-sm text-muted-foreground">
                                Nếu bật, báo cáo sinh viên nộp cần được GVHD duyệt. Nếu tắt, báo cáo sẽ tự động được chấp nhận.
                            </p>
                        </div>
                        <Switch
                            id="require-report-approval-switch"
                            checked={settings?.requireReportApproval ?? true} // Default to true
                            onCheckedChange={(checked) => handleFeatureToggle('requireReportApproval', checked)}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
