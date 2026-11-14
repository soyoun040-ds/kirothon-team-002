import Link from "next/link";
import ProjectList from "@/components/ProjectList";

// 메인 화면: 내가 한 프로젝트(저장소·과제) 목록. 폴더를 누르면 그 프로젝트의 전체 보고서로 간다.
// 트러블 카드 전체 목록은 /cards 에 있다.
export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">내 프로젝트</h1>
          <p className="mt-1 text-sm text-zinc-500">과제와 프로젝트를 하며 겪은 일을 폴더별로 모아 두었어요.</p>
        </div>
        <Link href="/cards" className="shrink-0 text-sm text-zinc-500 hover:text-zinc-900">
          트러블 카드 전체 보기 →
        </Link>
      </div>
      <ProjectList />
    </main>
  );
}
