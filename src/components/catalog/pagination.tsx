import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Pagination({ basePath, page, hasNext, query = {} }: { basePath: string; page: number; hasNext: boolean; query?: Record<string, string> }) {
  if (page <= 1 && !hasNext) return null;
  const href = (p: number) => `${basePath}?${new URLSearchParams({ ...query, page: String(p) })}`;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-3">
      {page > 1 && (
        <Button asChild variant="outline" size="sm">
          <Link href={href(page - 1)} rel="prev">Previous</Link>
        </Button>
      )}
      <span className="text-sm text-muted">Page {page}</span>
      {hasNext && (
        <Button asChild variant="outline" size="sm">
          <Link href={href(page + 1)} rel="next">Next</Link>
        </Button>
      )}
    </nav>
  );
}

export function pageFrom(v: string | string[] | undefined) {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n >= 1 && n <= 500 ? n : 1;
}
