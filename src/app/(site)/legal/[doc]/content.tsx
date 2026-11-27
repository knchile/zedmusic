import Link from "next/link";
import { siteConfig } from "@/lib/site";

/**
 * Legal documents. DRAFTS — have them reviewed by a Zambian legal practitioner before launch.
 * The upload-terms version string is stored with every music submission.
 */
export const UPLOAD_TERMS_VERSION = "2026-11-draft-1";

type Doc = { title: string; description: string; body: React.ReactNode };

export const legalDocs: Record<string, Doc> = {
  terms: {
    title: "Terms of Use",
    description: "The rules for using Zed Music Online as a listener or artist.",
    body: (
      <>
        <p>
          These terms apply to everyone who uses {siteConfig.name} (&ldquo;the platform&rdquo;), operated from
          Zambia. By creating an account or using the platform you agree to them.
        </p>
        <h2>Your account</h2>
        <ul>
          <li>Provide accurate information and keep your password secure. You are responsible for activity on your account.</li>
          <li>One person, one listener account. Accounts created to inflate streams will be suspended.</li>
          <li>You must be at least 13 years old to create an account.</li>
        </ul>
        <h2>Listening</h2>
        <p>
          Music on the platform is for personal, non-commercial listening. You may not download,
          record, redistribute or publicly perform it unless the rights holder allows it.
        </p>
        <h2>Fair play</h2>
        <p>
          You must not use bots, scripts, click farms, paid streaming services or any other method to
          artificially inflate plays, followers, likes or chart positions. We may remove such activity
          from statistics, remove songs from charts and suspend accounts involved.
        </p>
        <h2>Content you upload</h2>
        <p>
          Artists must also accept the <Link href="/legal/upload-terms">Artist Upload Terms</Link>.
        </p>
        <h2>Changes and termination</h2>
        <p>
          We may update these terms; significant changes will be announced on the platform. We may
          suspend accounts that break these terms. You can stop using the platform at any time.
        </p>
        <h2>Contact</h2>
        <p>Questions: <a href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a></p>
      </>
    ),
  },
  privacy: {
    title: "Privacy Policy",
    description: "What personal data Zed Music Online collects, why, and your rights.",
    body: (
      <>
        <p>
          We collect only what we need to run the platform, and we handle personal data in line
          with applicable Zambian law, including the Data Protection Act, 2021.
        </p>
        <h2>What we collect</h2>
        <ul>
          <li><strong>Account data:</strong> name, email address, password (stored only as a secure hash) and, if you sign in with Google, your Google profile name and picture.</li>
          <li><strong>Listening data:</strong> which songs you play, for how long, and when. This powers your history, recommendations, artist statistics and charts.</li>
          <li><strong>Technical data:</strong> approximate country, device type, and a one-way scrambled form of your IP address used to detect fraud. We do not store your raw IP address with listening data.</li>
          <li><strong>Artist data:</strong> profile information, uploads and, if you choose to connect them, authorised links to other music platforms.</li>
        </ul>
        <h2>What artists can see</h2>
        <p>
          Artists see <strong>aggregated</strong> statistics only — for example total streams, unique
          listener counts and country totals. Artists never see who you are or your individual
          listening history.
        </p>
        <h2>How long we keep data</h2>
        <p>
          Detailed play records are kept for up to 25 months for statistics and fraud review, after
          which only aggregated totals remain. Account data is kept while your account is active.
        </p>
        <h2>Sharing</h2>
        <p>
          We do not sell personal data. We use trusted service providers to host the platform, store
          files and send email, under agreements that protect your data.
        </p>
        <h2>Your rights</h2>
        <p>
          You may request access to, correction of or deletion of your personal data by emailing{" "}
          <a href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a>.
        </p>
      </>
    ),
  },
  "upload-terms": {
    title: "Artist Upload Terms",
    description: "What artists confirm when publishing music on Zed Music Online.",
    body: (
      <>
        <p>
          Version <code>{UPLOAD_TERMS_VERSION}</code>. Every time you submit music you confirm the
          following, and we record that confirmation with the submission.
        </p>
        <h2>Your rights confirmation</h2>
        <ul>
          <li>You own, or are authorised by every rights holder to distribute, the recording, the composition, the artwork and any samples it contains.</li>
          <li>Featured artists, producers and other contributors have agreed to the release and are credited accurately.</li>
          <li>The music does not infringe anyone&apos;s copyright, trademark or other rights, and does not contain unlawful content.</li>
        </ul>
        <h2>Licence to the platform</h2>
        <p>
          You keep ownership of your music. You grant {siteConfig.name} a non-exclusive,
          royalty-free licence to store, stream, display and promote it on the platform for as long
          as it is published. You can remove your music at any time.
        </p>
        <h2>Review</h2>
        <p>
          Submissions are reviewed before publication. We may reject or remove music that breaks
          these terms, is incorrectly attributed or is subject to a valid copyright complaint.
        </p>
        <h2>Statistics and charts</h2>
        <p>
          You must not buy or arrange fake plays. Manipulated activity is removed from statistics and
          can lead to removal from charts and suspension.
        </p>
      </>
    ),
  },
  copyright: {
    title: "Copyright & Takedowns",
    description: "How to report music on Zed Music Online that infringes your copyright.",
    body: (
      <>
        <p>
          We respect the rights of musicians, songwriters and labels. If you believe music on the
          platform infringes your copyright, tell us and we will act quickly.
        </p>
        <h2>How to submit a complaint</h2>
        <p>
          Email <a href={`mailto:${siteConfig.copyrightEmail}`}>{siteConfig.copyrightEmail}</a> with:
        </p>
        <ol>
          <li>Your name, contact details and, if acting for someone else, your authority to act.</li>
          <li>A description of the original work.</li>
          <li>The link(s) to the content on {siteConfig.name}.</li>
          <li>A statement that you believe in good faith the use is not authorised.</li>
          <li>A statement that the information is accurate, and your full name as signature.</li>
        </ol>
        <p>An online complaint form will be added here with the moderation tools.</p>
        <h2>What happens next</h2>
        <ol>
          <li>We acknowledge your complaint and review it, usually within 2 working days.</li>
          <li>If valid, the content is taken down and the uploader is notified.</li>
          <li>The uploader may send a counter-notice with evidence of their rights; we may then restore the content or ask both parties to resolve the dispute.</li>
          <li>Repeat infringers lose their upload privileges.</li>
        </ol>
      </>
    ),
  },
};
