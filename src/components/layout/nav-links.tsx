"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryNav } from "@/lib/site";
import { cn } from "@/lib/utils";
import { NavIcon } from "./nav-icon";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop sidebar navigation. */
export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="grid gap-1">
      {primaryNav.map((item) =>
        item.comingSoon ? (
          <span
            key={item.href}
            aria-disabled="true"
            title="Coming soon"
            className="flex h-11 cursor-not-allowed items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-2"
          >
            <NavIcon name={item.icon} className="size-5" />
            {item.label}
            <span className="ml-auto rounded-full bg-surface-3 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-muted uppercase">
              Soon
            </span>
          </span>
        ) : (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(pathname, item.href) ? "page" : undefined}
            className={cn(
              "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground",
              "aria-[current=page]:bg-surface-2 aria-[current=page]:text-foreground",
            )}
          >
            <NavIcon name={item.icon} className="size-5" />
            {item.label}
          </Link>
        ),
      )}
    </nav>
  );
}

/** Mobile bottom tab bar. Only shows destinations that exist. */
export function MobileTabBar() {
  const pathname = usePathname();
  const items = primaryNav.filter((i) => !i.comingSoon);
  return (
    <nav
      aria-label="Main"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl lg:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[0.7rem] font-medium transition-colors",
                  active ? "text-foreground" : "text-muted",
                )}
              >
                <NavIcon name={item.icon} className={cn("size-[22px]", active && "text-primary")} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
