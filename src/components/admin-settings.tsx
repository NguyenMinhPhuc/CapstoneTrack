

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDoc, useFirestore, useMemoFirebase, FirestorePermissionError, errorEmitter } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Switch } from '@/components/ui/switch';
import type { SystemSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';

const themeFormSchema = z.object({
  themePrimary: z.string().optional(),
  themePrimaryForeground: z.string().optional(),
  themeBackground: z.string().optional(),
  themeForeground: z.string().optional(),
  themeAccent: z.string().optional(),
  themeAccentForeground: z.string().optional(),
});

type ThemeFormData = z.infer<typeof themeFormSchema>;


export function AdminSettings() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const settingsDocRef = useMemoFirebase(() => doc(firestore, 'systemSettings', 'features'), [firestore]);
    const { data: settings, isLoading } = useDoc<SystemSettings>(settingsDocRef);
    const [goalHours, setGoalHours] = useState(700);
    
    const themeForm = useForm<ThemeFormData>({
      resolver: zodResolver(themeFormSchema),
      defaultValues: {
        themePrimary: '#dc2626',
        themePrimaryForeground: '#ffffff',
        themeBackground: '#f9fafb',
        themeForeground: '#0f172a',
        themeAccent: '#facc15',
        themeAccentForeground: '#1e293b',
      },
    });

    useEffect(() => {
        if (settings) {
            if (settings.earlyInternshipGoalHours) {
                setGoalHours(settings.earlyInternshipGoalHours);
            }
            themeForm.reset({
              themePrimary: settings.themePrimary || '#dc2626',
              themePrimaryForeground: settings.themePrimaryForeground || '#ffffff',
              themeBackground: settings.themeBackground || '#f9fafb',
              themeForeground: settings.themeForeground || '#0f172a',
              themeAccent: settings.themeAccent || '#facc15',
              themeAccentForeground: settings.themeAccentForeground || '#1e293b',
            })
        }
    }, [settings, themeForm]);

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

    const handleGoalHoursSave = async () => {
        const updateData = { earlyInternshipGoalHours: Number(goalHours) };
         setDoc(settingsDocRef, updateData, { merge: true })
            .then(() => {
                 toast({
                    title: 'Thành công',
                    description: 'Số giờ mục tiêu đã được cập nhật.',
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
    
    const onThemeSubmit = async (values: ThemeFormData) => {
      const updateData = {
        themePrimary: values.themePrimary,
        themePrimaryForeground: values.themePrimaryForeground,
        themeBackground: values.themeBackground,
        themeForeground: values.themeForeground,
        themeAccent: values.themeAccent,
        themeAccentForeground: values.themeAccentForeground,
      };

      setDoc(settingsDocRef, updateData, { merge: true })
        .then(() => {
          toast({
            title: 'Thành công',
            description: 'Giao diện đã được cập nhật.',
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
    };
    
    const ColorPickerField = ({ name, label }: { name: keyof ThemeFormData, label: string }) => (
      <FormField
        control={themeForm.control}
        name={name}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <div className="flex items-center gap-2">
                <Input type="color" {...field} className="p-1 h-10 w-14" />
                <Input
                  type="text"
                  value={field.value}
                  onChange={field.onChange}
                  className="w-full"
                />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );


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
                    <CardTitle>Cài đặt Giao diện</CardTitle>
                    <CardDescription>
                        Tùy chỉnh màu sắc chủ đạo của ứng dụng.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...themeForm}>
                    <form onSubmit={themeForm.handleSubmit(onThemeSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="space-y-4 p-4 border rounded-lg">
                                <h3 className="font-semibold">Màu Chủ đạo</h3>
                                <ColorPickerField name="themePrimary" label="Màu chính" />
                                <ColorPickerField name="themePrimaryForeground" label="Màu chữ" />
                            </div>
                            <div className="space-y-4 p-4 border rounded-lg">
                                <h3 className="font-semibold">Màu Nền</h3>
                                <ColorPickerField name="themeBackground" label="Màu chính" />
                                <ColorPickerField name="themeForeground" label="Màu chữ" />
                            </div>
                            <div className="space-y-4 p-4 border rounded-lg">
                                <h3 className="font-semibold">Màu Nhấn</h3>
                                <ColorPickerField name="themeAccent" label="Màu chính" />
                                <ColorPickerField name="themeAccentForeground" label="Màu chữ" />
                            </div>
                        </div>
                        <Button type="submit" disabled={themeForm.formState.isSubmitting}>Lưu Giao diện</Button>
                    </form>
                  </Form>
                </CardContent>
            </Card>
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
            <Card>
                 <CardHeader>
                    <CardTitle>Cài đặt Thực tập sớm</CardTitle>
                    <CardDescription>
                        Cấu hình các thông số cho chương trình thực tập sớm.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 rounded-lg border p-4">
                         <Label htmlFor="goal-hours-input" className="text-base">
                            Số giờ mục tiêu
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Tổng số giờ sinh viên cần hoàn thành trong chương trình thực tập sớm.
                        </p>
                        <div className="flex items-center gap-2 pt-2">
                             <Input
                                id="goal-hours-input"
                                type="number"
                                value={goalHours}
                                onChange={(e) => setGoalHours(Number(e.target.value))}
                                className="max-w-xs"
                            />
                            <Button onClick={handleGoalHoursSave}>Lưu</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
