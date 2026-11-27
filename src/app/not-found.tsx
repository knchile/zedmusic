import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="glow-green grid min-h-dvh place-items-center px-6 text-center">
      <div className="grid justify-items-center gap-5">
        <Logo />
        <p className="font-display text-7xl font-extrabold text-primary">404</p>
        <h1 className="font-display text-2xl font-bold">This page skipped a beat</h1>
        <p className="max-w-sm text-muted">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </main>
  );
}
