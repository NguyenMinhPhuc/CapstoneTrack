"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  useFirestore,
  errorEmitter,
  FirestorePermissionError,
} from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import type { InternshipCompany, Supervisor } from "@/lib/types";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Switch } from "./ui/switch";
import { SupervisorCombobox } from "./supervisor-combobox";
import { useState, useEffect } from "react";
import { Separator } from "./ui/separator";
import { PlusCircle, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

const positionSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Tên vị trí không được để trống."),
  quantity: z.coerce.number().min(1, "Số lượng phải lớn hơn 0."),
  description: z.string().optional(),
  supervisorId: z.string().optional(),
  supervisorName: z.string().optional(),
});

const formSchema = z.object({
  name: z.string().min(1, { message: "Tên doanh nghiệp là bắt buộc." }),
  address: z.string().optional(),
  website: z
    .string()
    .url({ message: "Vui lòng nhập URL hợp lệ." })
    .optional()
    .or(z.literal("")),
  description: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z
    .string()
    .email({ message: "Email không hợp lệ." })
    .optional()
    .or(z.literal("")),
  contactPhone: z.string().optional(),
  isLHU: z.boolean().default(false),
  companySupervisorId: z.string().optional(),
  companySupervisorName: z.string().optional(),
  positions: z.array(positionSchema).optional(),
});

interface EditCompanyFormProps {
  company: InternshipCompany;
  onFinished: () => void;
  readOnly?: boolean;
}

export function EditCompanyForm({
  company,
  onFinished,
  readOnly = false,
}: EditCompanyFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...company,
      positions:
        company.positions?.map((p) => ({ ...p, id: p.id || uuidv4() })) || [],
    },
  });

  useEffect(() => {
    form.reset({
      ...company,
      positions:
        company.positions?.map((p) => ({ ...p, id: p.id || uuidv4() })) || [],
    });
  }, [company, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "positions",
  });

  const isLHU = useWatch({ control: form.control, name: "isLHU" });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (readOnly) {
      onFinished();
      return;
    }
    const companyDocRef = doc(firestore, "internshipCompanies", company.id);

    const positionsToSave =
      values.positions?.map((p) => ({
        id: p.id || uuidv4(),
        title: p.title,
        quantity: p.quantity,
        description: p.description || "",
        supervisorId: p.supervisorId || "",
        supervisorName: p.supervisorName || "",
      })) || [];

    let dataToUpdate: any = {
      name: values.name,
      address: values.address || "",
      website: values.website || "",
      description: values.description || "",
      isLHU: values.isLHU,
      positions: positionsToSave,
    };

    if (!values.isLHU) {
      dataToUpdate = {
        ...dataToUpdate,
        contactName: values.contactName || "",
        contactEmail: values.contactEmail || "",
        contactPhone: values.contactPhone || "",
        companySupervisorId: values.companySupervisorId || "",
        companySupervisorName: values.companySupervisorName || "",
      };
    }

    if (newLogoFile) {
      const storage = getStorage();
      const path = `company-logos/${company.id}`;
      const sRef = storageRef(storage, path);
      await uploadBytes(sRef, newLogoFile);
      const url = await getDownloadURL(sRef);
      dataToUpdate.logoUrl = url;
    } else if (removeLogo) {
      dataToUpdate.logoUrl = "";
    }

    updateDoc(companyDocRef, dataToUpdate)
      .then(() => {
        toast({
          title: "Thành công",
          description: `Thông tin doanh nghiệp "${values.name}" đã được cập nhật.`,
        });
        onFinished();
      })
      .catch((error) => {
        const contextualError = new FirestorePermissionError({
          path: companyDocRef.path,
          operation: "update",
          requestResourceData: dataToUpdate,
        });
        errorEmitter.emit("permission-error", contextualError);
      });
  }

  const handleSupervisorSelect = (
    index: number,
    supervisor: Supervisor | null
  ) => {
    form.setValue(`positions.${index}.supervisorId`, supervisor?.id || "");
    form.setValue(
      `positions.${index}.supervisorName`,
      supervisor ? `${supervisor.firstName} ${supervisor.lastName}` : ""
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Chỉnh sửa Doanh nghiệp</DialogTitle>
        <DialogDescription>
          Cập nhật thông tin chi tiết của doanh nghiệp.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <ScrollArea className="h-[60vh] pr-6">
            <div className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên Doanh nghiệp / Phòng ban</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Công ty TNHH ABC"
                        {...field}
                        disabled={readOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isLHU"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Đây là phòng ban của LHU?</FormLabel>
                      <FormMessage />
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={readOnly}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Địa chỉ</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="123 Đường ABC, Quận 1, TP.HCM"
                        {...field}
                        disabled={readOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com"
                        {...field}
                        disabled={readOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mô tả</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Mô tả về công ty, lĩnh vực hoạt động, vị trí thực tập, yêu cầu..."
                        className="resize-y"
                        {...field}
                        disabled={readOnly}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Hỗ trợ Markdown (tiêu đề, danh sách, liên kết, bảng...)
                    </p>
                    <FormMessage />
                    {field.value && (
                      <div className="mt-2 border rounded-md p-3 bg-muted/20 markdown-preview">
                        <div className="text-xs font-medium mb-1 text-muted-foreground">
                          Xem trước
                        </div>
                        <div>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {field.value}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Logo</FormLabel>
                {company.logoUrl ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={company.logoUrl}
                      alt="Logo"
                      className="h-10 w-10 object-contain rounded bg-muted"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setRemoveLogo(true)}
                      disabled={readOnly}
                    >
                      Xóa logo
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Chưa có logo</p>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewLogoFile(e.target.files?.[0] || null)}
                  disabled={readOnly}
                />
                {newLogoFile && (
                  <p className="text-xs text-muted-foreground">
                    Sẽ cập nhật: {newLogoFile.name}
                  </p>
                )}
              </div>

              <Separator />
              <div>
                <h3 className="text-lg font-medium mb-2">
                  Các vị trí tuyển dụng
                </h3>
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="p-4 border rounded-md relative space-y-4"
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => remove(index)}
                        disabled={readOnly}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name={`positions.${index}.title`}
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Tên vị trí</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Ví dụ: Thực tập sinh Frontend"
                                  {...field}
                                  disabled={readOnly}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`positions.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Số lượng</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="1"
                                  {...field}
                                  disabled={readOnly}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name={`positions.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mô tả vị trí (tùy chọn)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Yêu cầu, kỹ năng, công việc chính..."
                                {...field}
                                disabled={readOnly}
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              Hỗ trợ Markdown để mô tả rõ ràng hơn.
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {isLHU && (
                        <FormField
                          control={form.control}
                          name={`positions.${index}.supervisorId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Người phụ trách (GVHD)</FormLabel>
                              <FormControl>
                                <SupervisorCombobox
                                  value={field.value || null}
                                  onChange={(supervisorId) =>
                                    field.onChange(supervisorId || "")
                                  }
                                  onSupervisorSelect={(supervisor) =>
                                    handleSupervisorSelect(index, supervisor)
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      append({
                        id: uuidv4(),
                        title: "",
                        quantity: 1,
                        description: "",
                        supervisorId: "",
                        supervisorName: "",
                      })
                    }
                    disabled={readOnly}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Thêm vị trí
                  </Button>
                </div>
              </div>
              <Separator />

              {!isLHU && (
                <>
                  <FormField
                    control={form.control}
                    name="companySupervisorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GV hướng dẫn (trường)</FormLabel>
                        <FormControl>
                          <SupervisorCombobox
                            value={field.value || null}
                            onChange={(supervisorId) =>
                              field.onChange(supervisorId || "")
                            }
                            onSupervisorSelect={(s: Supervisor | null) => {
                              form.setValue("companySupervisorId", s?.id || "");
                              form.setValue(
                                "companySupervisorName",
                                s ? `${s.firstName} ${s.lastName}` : ""
                              );
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên người liên hệ</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nguyễn Văn A"
                            {...field}
                            disabled={readOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email liên hệ</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="contact@example.com"
                              {...field}
                              disabled={readOnly}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Số điện thoại liên hệ</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="090 xxx xxxx"
                              {...field}
                              disabled={readOnly}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={onFinished}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={readOnly || form.formState.isSubmitting}
            >
              {form.formState.isSubmitting
                ? "Đang lưu..."
                : readOnly
                ? "Đóng"
                : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
