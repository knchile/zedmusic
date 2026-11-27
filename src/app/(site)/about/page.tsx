import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/content/prose";

export const metadata: Metadata = {
  title: "About",
  description: "Zed Music Online is a streaming, analytics and charts platform dedicated to Zambian music.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Prose>
        <h1>About Zed Music Online</h1>
        <p>
          Zed Music Online is a home for Zambian music: a place to discover and stream artists from
          Lusaka to the Copperbelt and beyond, and a place where artists can publish their music and
          see clearly how it is performing.
        </p>
        <h2>What we&apos;re building</h2>
        <ul>
          <li><strong>For listeners</strong> — a fast, mobile-first player, playlists, and an easy way to follow the artists you love.</li>
          <li><strong>For artists</strong> — free profiles, reviewed releases, and honest analytics that show exactly where every number comes from.</li>
          <li><strong>For the industry</strong> — the official <Link href="/charts">Zed Music Online Top 10</Link>, built on a <Link href="/charts/methodology">published methodology</Link>.</li>
        </ul>
        <h2>Our principles</h2>
        <ul>
          <li>No fake streams, fake profiles or invented statistics.</li>
          <li>Artists own their music and their data.</li>
          <li>Charts that can be checked, not just trusted.</li>
        </ul>
      </Prose>
    </div>
  );
}
