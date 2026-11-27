import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="glow-green flex min-h-dvh flex-col">
      <div className="flag-stripe h-1 w-full" />
      <header className="flex h-16 items-center px-5 sm:px-8">
        <Link href="/" aria-label="Zed Music Online home">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-4 pb-16 sm:items-center sm:pt-0">
        <div className="w-full max-w-md animate-fade-up rounded-xl border border-border bg-surface/95 p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
