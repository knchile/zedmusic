import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Prose } from "@/components/content/prose";
import { Alert } from "@/components/ui/primitives";
import { legalDocs } from "./content";

export function generateStaticParams() {
  return Object.keys(legalDocs).map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: PageProps<"/legal/[doc]">): Promise<Metadata> {
  const { doc } = await params;
  const d = legalDocs[doc];
  if (!d) return {};
  return { title: d.title, description: d.description, alternates: { canonical: `/legal/${doc}` } };
}

export default async function LegalPage({ params }: PageProps<"/legal/[doc]">) {
  const { doc } = await params;
  const d = legalDocs[doc];
  if (!d) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <Prose>
        <h1>{d.title}</h1>
        <Alert tone="warning" title="Draft" className="my-6">
          This document is a working draft pending legal review.
        </Alert>
        {d.body}
      </Prose>
    </div>
  );
}
