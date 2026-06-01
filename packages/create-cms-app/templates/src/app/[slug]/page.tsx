import { cms } from "@/lib/cms";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await cms.renderContent("Public", slug).catch(() => null);
  if (!result) return {};
  return {
    title: result.pageTitle,
    description: result.seoDescription ?? undefined,
    openGraph: result.ogImageUrl
      ? { images: [result.ogImageUrl] }
      : undefined,
  };
}

export default async function DynamicPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await cms.renderContent("Public", slug).catch(() => null);

  if (!result) notFound();

  return (
    <>
      {result.css && <style dangerouslySetInnerHTML={{ __html: result.css }} />}
      <div dangerouslySetInnerHTML={{ __html: result.html }} />
      {result.js && (
        <script dangerouslySetInnerHTML={{ __html: result.js }} />
      )}
    </>
  );
}
