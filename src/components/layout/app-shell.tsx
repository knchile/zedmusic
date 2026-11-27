import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { PlayerProvider } from "@/components/player/player-ui";
import { footerNav, siteConfig } from "@/lib/site";
import { MobileTabBar, SidebarNav } from "./nav-links";
import { UserNav, UserNavSkeleton } from "./user-nav";

/**
 * Persistent application frame. Lives in the (site) layout so it — and the audio
 * player mounted here — survives client-side navigation.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-dvh flex-col gap-8 border-r border-border bg-surface/60 px-4 pt-6 pb-28 lg:flex">
        <Link href="/" className="px-2" aria-label={`${siteConfig.name} home`}>
          <Logo />
        </Link>
        <SidebarNav />
        <div className="mt-auto grid gap-3 rounded-xl border border-border bg-surface-2 p-4">
          <p className="font-display text-sm font-semibold">Are you an artist?</p>
          <p className="text-xs leading-relaxed text-muted">
            Create your profile, upload your music and track how it performs.
          </p>
          <Link href="/studio" className="text-xs font-semibold text-primary hover:underline">
            Open the artist studio →
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
          <div className="flag-stripe h-[3px] w-full lg:hidden" />
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
            <Link href="/" className="lg:hidden" aria-label={`${siteConfig.name} home`}>
              <Logo />
            </Link>
            <div className="hidden lg:block" />
            <Suspense fallback={<UserNavSkeleton />}>
              <UserNav />
            </Suspense>
          </div>
        </header>

        <main id="main" className="flex-1 px-4 pt-6 pb-12 sm:px-6 lg:px-10">
          {children}
        </main>

        {/* Bottom padding clears the mobile tab bar + mini player, and the desktop player bar. */}
        <footer className="border-t border-border px-4 pt-8 pb-44 text-sm text-muted sm:px-6 lg:px-10 lg:pb-32">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="grid gap-2">
              <Logo />
              <p className="max-w-sm text-xs leading-relaxed">
                The home of Zambian music — streaming, artist analytics and the official Zed Music
                Online Top 10.
              </p>
            </div>
            <nav aria-label="Footer" className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
              {footerNav.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-foreground">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <p className="mt-8 text-xs text-muted-2">
            © {siteConfig.name}. Made in Zambia 🇿🇲
          </p>
        </footer>
      </div>

      <MobileTabBar />
      <PlayerProvider />
    </div>
  );
}
