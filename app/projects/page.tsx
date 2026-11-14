import Link from "next/link";
import ProjectList from "@/components/ProjectList";

// 프로젝트(저장소) 목록. 하나를 고르면 프로젝트 전체 보고서로 간다.
export default function ProjectsPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link href="/" className="text-sm text-zinc-500">← 카드 목록으로</Link>
      <h1 className="mb-6 mt-4 text-2xl font-semibold">프로젝트 보고서</h1>
      <ProjectList />
    </main>
  );
}
