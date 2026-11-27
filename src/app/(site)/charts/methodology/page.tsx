import type { Metadata } from "next";
import { Prose } from "@/components/content/prose";
import { Alert } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Chart methodology",
  description:
    "How the official Zed Music Online Top 10 is calculated: qualified streams, anti-manipulation safeguards, chart periods and publication rules.",
  alternates: { canonical: "/charts/methodology" },
};

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Prose>
        <h1>Chart methodology</h1>
        <p>
          The Zed Music Online Top 10 aims to answer one question honestly: <strong>which songs are
          Zambians actually listening to most?</strong> This page explains exactly how we count,
          what we exclude, and how charts are published. Methodology version 1.
        </p>

        <Alert tone="info" title="Launch methodology" className="my-6">
          At launch, charts use only streams recorded on Zed Music Online. External platform data
          will only be added once it is verified, covers exactly the same period, and the weighting
          is published here first.
        </Alert>

        <h2>1. What counts as a stream</h2>
        <p>A play becomes a <strong>qualified stream</strong> only when all of these are true:</p>
        <ul>
          <li>The listener has played at least <strong>30 seconds</strong> of the song, measured by our servers — not just reported by the browser.</li>
          <li>The song is at least <strong>60 seconds</strong> long.</li>
          <li>The play session was started by our player with a server-issued, single-use play token.</li>
          <li>The play is not flagged as automated or abnormal (see below).</li>
        </ul>
        <p>Pressing play, skipping after a few seconds, or refreshing a page does not create a stream.</p>

        <h2>2. Limits that stop chart manipulation</h2>
        <table>
          <thead>
            <tr>
              <th>Rule</th>
              <th>Limit</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Qualified streams per listener, per song, per day</td>
              <td>5</td>
            </tr>
            <tr>
              <td>Qualified streams per listener, per day (all songs)</td>
              <td>300</td>
            </tr>
            <tr>
              <td>Qualified streams per network address, per song, per day</td>
              <td>50 (allows shared Wi-Fi and mobile carrier networks)</td>
            </tr>
          </tbody>
        </table>
        <p>
          Plays beyond these limits still play normally — they just don&apos;t count towards charts.
          Days run midnight to midnight in Zambia time (CAT, UTC+2).
        </p>
        <p>
          We also review suspicious patterns: bursts of plays from one network, back-to-back loops of
          one song, automated browsers, and accounts created only to stream. Confirmed manipulation
          is removed from all statistics, and repeated attempts can lead to removal from charts.
        </p>

        <h2>3. Who counts towards the chart</h2>
        <p>
          Chart streams come from <strong>signed-in listeners</strong>. Anyone can listen without an
          account, and those plays appear in artists&apos; statistics, but signed-in listening is much
          harder to fake, so it is what ranks the chart.
        </p>

        <h2>4. Chart periods</h2>
        <ul>
          <li>The weekly chart tracks <strong>Friday 00:00 to Thursday 23:59</strong>, Zambia time.</li>
          <li>Each chart records a <strong>data cut-off time</strong>. Streams processed later never change a published chart.</li>
          <li>Ties are broken by more unique listeners, then by the earlier release date.</li>
        </ul>

        <h2>5. Review and publication</h2>
        <p>
          Charts are calculated automatically from validated data. Before publication, the Zed Music
          Online team reviews the result and any open fraud alerts. A published chart is stored as a
          permanent snapshot together with the exact rules used, so anyone can check how it was
          produced and history never shifts.
        </p>

        <h2>6. Other charts</h2>
        <ul>
          <li><strong>Top 10 Zambian Songs</strong> — the same rules, limited to Zambian artists.</li>
          <li><strong>Top 10 Emerging Artists</strong> — songs by artists our editors classify as early-career.</li>
          <li><strong>Top 10 New Releases</strong> — songs released in the last 8 weeks.</li>
          <li><strong>Top 10 by Genre</strong> — the same rules, within one genre.</li>
        </ul>

        <h2>7. External platforms</h2>
        <p>
          Numbers from other services (YouTube, Spotify, Audiomack, Boomplay and others) are shown
          to artists separately and labelled by source and verification status. Different platforms
          count plays differently, so we never simply add them together. If external data is ever
          used in a chart, the weighting and its justification will be published here before it
          takes effect.
        </p>

        <h2>8. Changes to this methodology</h2>
        <p>
          Rule changes get a new version number, are announced before they apply, and are never
          applied retroactively to published charts.
        </p>
      </Prose>
    </div>
  );
}
