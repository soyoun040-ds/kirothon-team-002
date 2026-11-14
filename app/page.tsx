import Link from "next/link";
import ProjectList from "@/components/ProjectList";

// 메인 화면: 내가 한 프로젝트(저장소·과제) 목록. 하나를 고르면 그 프로젝트의 전체 보고서로 간다.
// 트러블 카드 전체 목록은 /cards 에 있다.
export default function Home() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">내 프로젝트</h1>
        <Link href="/cards" className="text-sm text-violet-700 underline-offset-2 hover:underline">
          트러블 카드 전체 보기 →
        </Link>
      </div>
      <ProjectList />
    </main>
  );
}
