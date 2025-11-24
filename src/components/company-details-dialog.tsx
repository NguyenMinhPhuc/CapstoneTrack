"use client";

import React from "react";
import type { InternshipCompany } from "@/lib/types";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Building2, Globe, Phone, Mail, User, CheckCircle } from "lucide-react";

interface CompanyDetailsDialogProps {
  company: InternshipCompany;
  onClose?: () => void;
}

export function CompanyDetailsDialog({ company }: CompanyDetailsDialogProps) {
  const positions = company.positions || [];
  const positionCount = positions.length;
  const totalCapacity = positions.reduce(
    (sum, p) => sum + (p.quantity || 0),
    0
  );

  // Some stored markdown may have escaped characters like \* \_ etc.
  const normalizeMarkdown = (src: string) => src.replace(/\\([*_`~\\])/g, "$1");

  return (
    <DialogContent className="sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {company.name}
          {company.isLHU && (
            <Badge
              variant="outline"
              className="flex items-center gap-1 text-green-600"
            >
              <CheckCircle className="h-3 w-3" /> LHU
            </Badge>
          )}
        </DialogTitle>
        <DialogDescription>
          <span className="font-medium">Tổng quan:</span> {positionCount} vị trí
          / {totalCapacity} SV tiếp nhận
        </DialogDescription>
      </DialogHeader>
      <ScrollArea className="max-h-[70vh] pr-4">
        <div className="space-y-6 text-sm">
          <div className="grid gap-2 text-sm">
            {company.address && (
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />{" "}
                <span>{company.address}</span>
              </div>
            )}
            {company.website && (
              <div className="flex items-start gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />{" "}
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {company.website}
                </a>
              </div>
            )}
            {(company.contactName ||
              company.contactEmail ||
              company.contactPhone) && (
              <div className="space-y-1">
                {company.contactName && (
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />{" "}
                    <span>{company.contactName}</span>
                  </div>
                )}
                {company.contactEmail && (
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />{" "}
                    <span>{company.contactEmail}</span>
                  </div>
                )}
                {company.contactPhone && (
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />{" "}
                    <span>{company.contactPhone}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          {company.description && (
            <div className="space-y-2">
              <h4 className="font-semibold">Mô tả</h4>
              <div className="prose prose-sm max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                >
                  {normalizeMarkdown(company.description)}
                </ReactMarkdown>
              </div>
            </div>
          )}
          <Separator />
          <div className="space-y-3">
            <h4 className="font-semibold">Vị trí tuyển dụng</h4>
            {positions.length === 0 && (
              <div className="text-muted-foreground">Không có vị trí nào.</div>
            )}
            <div className="space-y-2">
              {positions.map((p) => (
                <div
                  key={p.id}
                  className="rounded border p-3 bg-muted/40 space-y-1"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{p.title}</span>
                    <Badge variant="secondary">{p.quantity} SV</Badge>
                  </div>
                  {p.description && (
                    <div className="prose prose-xs max-w-none text-muted-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                      >
                        {normalizeMarkdown(p.description)}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </DialogContent>
  );
}
