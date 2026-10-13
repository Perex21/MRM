import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CaseStudy } from "@/components/projects/CaseStudy";
import { getProject, projects } from "@/content/projects";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  // Rejecting here, before any HTML is sent, gives unknown slugs a real 404 status.
  if (!project) notFound();

  const path = `/work/${project.slug}`;
  return {
    title: project.title,
    description: project.summary,
    alternates: { canonical: path },
    openGraph: { type: "article", title: project.title, description: project.summary, url: path },
  };
}

export default function CaseStudyPage({ params }: Props) {
  // Reading `params` inside Suspense keeps navigation to this route instant.
  // The three known slugs are prerendered, so the fallback is never painted for them.
  return (
    <Suspense fallback={null}>
      <Study params={params} />
    </Suspense>
  );
}

async function Study({ params }: Props) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  return <CaseStudy project={project} />;
}
