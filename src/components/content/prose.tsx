import { cn } from "@/lib/utils";

/** Typography wrapper for long-form content pages (legal, methodology, about). */
export function Prose({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "max-w-3xl text-[0.95rem] leading-relaxed text-muted",
        "[&_h1]:mb-4 [&_h1]:font-display [&_h1]:text-4xl [&_h1]:font-extrabold [&_h1]:text-foreground",
        "[&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground",
        "[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground",
        "[&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1",
        "[&_strong]:text-foreground [&_a]:font-semibold [&_a]:text-primary hover:[&_a]:underline",
        "[&_table]:my-4 [&_table]:w-full [&_table]:text-sm [&_th]:border-b [&_th]:border-border [&_th]:py-2 [&_th]:text-left [&_th]:text-foreground [&_td]:border-b [&_td]:border-border [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top",
        className,
      )}
    >
      {children}
    </div>
  );
}
