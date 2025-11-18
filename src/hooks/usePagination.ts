import { useEffect, useMemo, useState } from "react";

export type PaginationState = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
};

export function usePagination<T>(items: T[] | undefined, pageSize = 50) {
  const [page, setPage] = useState(1);

  const total = items?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);

  const pageItems = useMemo(() => {
    if (!items) return [] as T[];
    return items.slice(startIndex, endIndex);
  }, [items, startIndex, endIndex]);

  useEffect(() => {
    // Reset to first page when the items array identity changes
    setPage(1);
  }, [items]);

  const next = () => setPage((p) => Math.min(totalPages, p + 1));
  const prev = () => setPage((p) => Math.max(1, p - 1));
  const setPageSafe = (p: number) =>
    setPage(Math.max(1, Math.min(totalPages, p)));

  const state: PaginationState = {
    page: safePage,
    pageSize,
    total,
    totalPages,
    startIndex,
    endIndex,
  };

  return { items: pageItems, state, next, prev, setPage: setPageSafe } as const;
}
