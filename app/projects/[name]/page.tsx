import Link from "next/link";
import { Suspense } from "react";
import ProjectReportView from "@/components/ProjectReportView";

// Cache Components 규칙: params는 <Suspense> 안에서 읽어야 빌드가 통과한다. (app/cards/[id]/page.tsx와 같은 방식)
export default function ProjectReportPage({ params }: { params: Promise<{ name: string }> }) {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link href="/" className="text-sm text-zinc-500 print:hidden">← 내 프로젝트 목록으로</Link>
      <Suspense fallback={<p className="mt-6 text-zinc-500">불러오는 중...</p>}>
        <ProjectReport params={params} />
      </Suspense>
    </main>
  );
}

async function ProjectReport({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  return <ProjectReportView name={decodeURIComponent(name)} />;
}
