"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PaginationState } from "@/hooks/usePagination";

export function PaginationControls({
  state,
  onPrev,
  onNext,
  className,
}: {
  state: PaginationState;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
}) {
  const disabledPrev = state.page <= 1;
  const disabledNext = state.page >= state.totalPages;

  return (
    <div className={className ?? "mt-4 flex items-center justify-between"}>
      <div className="text-sm text-muted-foreground">
        Hiển thị {state.total === 0 ? 0 : state.startIndex + 1}–{state.endIndex}{" "}
        trong {state.total}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={disabledPrev}
        >
          <ChevronLeft className="h-4 w-4" />
          Trước
        </Button>
        <span className="text-sm">
          Trang {state.page}/{state.totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={disabledNext}
        >
          Sau
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
