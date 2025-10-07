
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDoc, useFirestore, useMemoFirebase, FirestorePermissionError, errorEmitter } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { SystemSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

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
                <CardContent>
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        );
    }
    
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Tính năng Chấm điểm</CardTitle>
                    <CardDescription>
                        Bật hoặc tắt các tính năng hỗ trợ trong quá trình chấm điểm.
                    </CardDescription>
                </CardHeader>
                <CardContent>
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
                </CardContent>
            </Card>
        </div>
    );
}
