"use client";
// Legacy component removed. Kept as empty stub to prevent import errors.
export default function MyEditCompanyForm() {
  return null;
}
/* Legacy code below commented out to avoid type errors.
  contactPhone: company.contactPhone || "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!canEdit) return;
    const companyDocRef = doc(firestore, "internshipCompanies", company.id);
    const dataToUpdate: any = {
      name: values.name,
      address: values.address || "",
      website: values.website || "",
      description: values.description || "",
      contactName: values.contactName || "",
      contactEmail: values.contactEmail || "",
      contactPhone: values.contactPhone || "",
    };
    try {
      if (logoFile) {
        const storageRef = ref(storage, `company-logos/${company.id}`);
        await uploadBytes(storageRef, logoFile);
        const url = await getDownloadURL(storageRef);
        dataToUpdate.logoUrl = url;
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể tải logo.' });
      return;
    }
    updateDoc(companyDocRef, dataToUpdate)
      .then(() => {
        toast({ title: "Thành công", description: `Đã cập nhật đơn vị "${values.name}".` });
        onFinished();
      })
      .catch((error) => {
        const contextualError = new FirestorePermissionError({
          path: companyDocRef.path,
          operation: 'update',
          requestResourceData: dataToUpdate,
        });
        errorEmitter.emit('permission-error', contextualError);
        toast({ variant: 'destructive', title: 'Lỗi', description: 'Không thể cập nhật.' });
      });
  }

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Sửa Đơn vị thực tập</DialogTitle>
        <DialogDescription>Cập nhật thông tin đơn vị mà bạn quản lý.</DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <ScrollArea className="h-[55vh] pr-6">
            <div className="space-y-4 py-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên đơn vị</FormLabel>
                  <FormControl><Input disabled={!canEdit} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel>Địa chỉ</FormLabel>
                  <FormControl><Input disabled={!canEdit} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="website" render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl><Input disabled={!canEdit} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả</FormLabel>
                  <FormControl><Textarea disabled={!canEdit} className="resize-y" {...field} /></FormControl>
                  {field.value && (
                    <div className="mt-2 border rounded-md p-3 bg-muted/50">
                      <div className="text-xs font-semibold mb-1">Xem trước</div>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{field.value}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )} />
              <div className="space-y-2">
                <FormLabel>Logo</FormLabel>
                {company.logoUrl ? (
                  <div className="flex items-center gap-3">
                    <img src={company.logoUrl} alt="Logo" className="h-10 w-10 rounded object-cover border" />
                    {canEdit && (
                      <Button type="button" variant="outline" size="sm" onClick={() => setLogoFile(null)}>
                        Chọn logo mới
                      </Button>
                    )}
                  </div>
                ) : null}
                {canEdit && (
                  <>
                    <Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                    <div className="flex gap-2">
                      <Button type="button" variant="secondary" size="sm" onClick={async () => {
                        try {
                          const storageRef = ref(storage, `company-logos/${company.id}`);
                          await deleteObject(storageRef);
                        } catch {}
                        await updateDoc(doc(firestore, 'internshipCompanies', company.id), { logoUrl: '' });
                        toast({ title: 'Đã xóa logo' });
                        onFinished();
                      }}>Xóa logo</Button>
                    </div>
                  </>
                )}
                <p className="text-xs text-muted-foreground">PNG/JPG, khuyến nghị <= 1MB.</p>
              </div>
              <FormField control={form.control} name="contactName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Người liên hệ</FormLabel>
                  <FormControl><Input disabled={!canEdit} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="contactEmail" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email liên hệ</FormLabel>
                    <FormControl><Input disabled={!canEdit} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="contactPhone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>SĐT liên hệ</FormLabel>
                    <FormControl><Input disabled={!canEdit} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="rounded-md border p-3 text-xs text-muted-foreground">
                Chủ sở hữu: {company.ownerSupervisorName || 'N/A'}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={onFinished}>Đóng</Button>
            {canEdit && <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}</Button>}
          </DialogFooter>
        </form>
      </Form>
    </div>
  );
}
*/
