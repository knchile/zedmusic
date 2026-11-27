import { BarChart3, Disc3, Home, Info, Library, Mic2, Search } from "lucide-react";
import type { NavItem } from "@/lib/site";

const icons = {
  home: Home,
  chart: BarChart3,
  info: Info,
  search: Search,
  library: Library,
  disc: Disc3,
  mic: Mic2,
} satisfies Record<NavItem["icon"], unknown>;

export function NavIcon({ name, className }: { name: NavItem["icon"]; className?: string }) {
  const Icon = icons[name];
  return <Icon className={className} aria-hidden />;
}
