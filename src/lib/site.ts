/** Public, non-secret site configuration shared by server and client code. */
export const siteConfig = {
  name: "Zed Music Online",
  shortName: "Zed Music",
  domain: "zedmusic.online",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://www.zedmusic.online",
  description:
    "Discover, stream and follow Zambian music. Official Zed Music Online Top 10 charts, built on transparent, verified streaming data.",
  supportEmail: "support@zedmusic.online",
  copyrightEmail: "copyright@zedmusic.online",
} as const;

export type NavItem = {
  href: string;
  label: string;
  icon: "home" | "chart" | "info" | "search" | "library" | "disc" | "mic";
  /** Not yet available: rendered as a labelled, non-interactive item. */
  comingSoon?: boolean;
  /** Hidden from the mobile tab bar (limited space). */
  desktopOnly?: boolean;
};

/** Primary navigation. Items marked comingSoon are shown but clearly unavailable. */
export const primaryNav: NavItem[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/search", label: "Search", icon: "search" },
  { href: "/charts", label: "Charts", icon: "chart" },
  { href: "/new-releases", label: "New releases", icon: "disc", desktopOnly: true },
  { href: "/artists", label: "Artists", icon: "mic", desktopOnly: true },
  { href: "/library", label: "Library", icon: "library" },
];

export const footerNav = [
  { href: "/about", label: "About" },
  { href: "/charts/methodology", label: "Chart methodology" },
  { href: "/legal/terms", label: "Terms" },
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/upload-terms", label: "Artist upload terms" },
  { href: "/legal/copyright", label: "Copyright & takedowns" },
];
