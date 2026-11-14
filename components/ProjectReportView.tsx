"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

// 프로젝트 전체 보고서 (노션 문서처럼).
// 1) GET  /api/projects/[name]/report  수집된 기록 (바로 뜸)
// 2) POST /api/projects/[name]/report  기록을 AI가 다듬은 문단 (처음 한 번 약 20초, 이후 서버가 기억해서 바로 뜸)
// 화면에는 다듬어진 문장을 본문으로 보여 주고, 원본 기록은 "자세히 보기"에 접어 둔다. "PDF로 저장"은 브라우저 인쇄.
type Report = {
  project_name: string;
  period: { start: string | null; end: string | null };
  counts: { events: number; prompts: number; shells: number; failed_shells: number; files: number; cards: number };
  overview: {
    description?: { product: string; readme: string; package_name: string; package_description: string };
    requirements: string;
  };
  my_work: { tasks: { name: string; success: boolean; at: string }[]; prompts: { text: string; at: string }[]; files: string[] };
  troubles: { id: string; title: string; situation: string; task: string }[];
  solutions: { id: string; title: string; action: string; result: string; needs_check: string[] }[];
};
type Summary = { overview: string; my_work: string; difficulties: string; solutions: string };

const fmtDate = (t: string | null) =>
  t ? new Date(t).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";
const clip = (t: string, n: number) => {
  const s = t.replace(/\s+/g, " ").trim();
  return s.length > n ? `${s.slice(0, n)}…` : s;
};

function Section({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return (
    <section className="mt-12 break-inside-avoid">
      <h2 className="flex items-center gap-2 text-xl font-semibold text-zinc-900">
        <span>{icon}</span>
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

// AI가 다듬은 본문. 아직 만드는 중이면 자리 표시, 실패하면 대체 문장.
function Prose({ text, loading, fallback }: { text?: string; loading: boolean; fallback: string }) {
  if (text) return <p className="text-[16px] leading-8 text-zinc-800">{text}</p>;
  if (loading)
    return (
      <div className="space-y-2.5 py-1" aria-label="정리하는 중">
        <div className="h-3.5 w-11/12 animate-pulse rounded bg-zinc-100" />
        <div className="h-3.5 w-10/12 animate-pulse rounded bg-zinc-100" />
        <div className="h-3.5 w-7/12 animate-pulse rounded bg-zinc-100" />
      </div>
    );
  return <p className="text-[15px] leading-7 text-zinc-500">{fallback}</p>;
}

// 노션 토글: 처음엔 접혀 있다
function Toggle({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="group">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded px-1 text-sm text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 print:hidden">
        <span className="inline-block text-xs transition-transform group-open:rotate-90">▶</span>
        {label}
      </summary>
      <div className="mt-3 border-l-2 border-zinc-100 pl-4">{children}</div>
    </details>
  );
}

function Stat({ label, value, warn }: { label: string; value: number | string; warn?: boolean }) {
  return (
    <div className="rounded-lg bg-zinc-50 px-4 py-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`mt-0.5 text-xl font-semibold ${warn ? "text-rose-600" : "text-zinc-900"}`}>{value}</div>
    </div>
  );
}

function SubLabel({ children }: { children: ReactNode }) {
  return <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">{children}</div>;
}

export default function ProjectReportView({ name }: { name: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryState, setSummaryState] = useState<"loading" | "done" | "failed">("loading");

  useEffect(() => {
    let ignore = false;
    const url = `/api/projects/${encodeURIComponent(name)}/report`;
    (async () => {
      // 1) 기록
      try {
        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `보고서 조회 실패 (HTTP ${res.status})`);
        if (ignore) return;
        setReport(json.data as Report);
      } catch (e) {
        if (!ignore) setError(e instanceof Error ? e.message : "보고서를 불러오지 못했습니다.");
        return;
      }
      // 2) AI가 다듬은 문단
      try {
        const res = await fetch(url, { method: "POST" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "AI 정리 실패");
        if (!ignore) {
          setSummary(json.data as Summary);
          setSummaryState("done");
        }
      } catch {
        if (!ignore) setSummaryState("failed");
      }
    })();
    return () => {
      ignore = true;
    };
  }, [name]);

  if (error) return <p className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">오류: {error}</p>;
  if (!report) return <p className="mt-6 text-zinc-400">불러오는 중...</p>;

  const c = report.counts;
  const d = report.overview.description ?? { product: "", readme: "", package_name: "", package_description: "" };
  const loading = summaryState === "loading";
  const prompts = [...report.my_work.prompts].reverse(); // 최근 것부터

  return (
    <article className="mt-8">
      {/* 문서 머리 */}
      <div className="text-5xl">📁</div>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-900">{report.project_name}</h1>
      {d.package_description && <p className="mt-2 text-lg text-zinc-500">{d.package_description}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-400">
        <span>
          🗓 {fmtDate(report.period.start)} ~ {fmtDate(report.period.end)}
        </span>
        {loading && <span className="text-violet-500">✨ 기록을 정리하는 중… (처음 한 번 20초 정도)</span>}
        <button
          onClick={() => window.print()}
          className="ml-auto rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 print:hidden"
        >
          PDF로 저장
        </button>
      </div>
      <hr className="mt-6 border-zinc-200" />

      {/* 1. 이 프로젝트는 */}
      <Section icon="📌" title="이 프로젝트는">
        <Prose
          text={summary?.overview}
          loading={loading}
          fallback={d.package_description || "프로젝트 설명을 만들지 못했습니다. 잠시 후 새로고침해 주세요."}
        />
      </Section>

      {/* 2. 내가 한 일 */}
      <Section icon="🙋" title="내가 한 일">
        <Prose text={summary?.my_work} loading={loading} fallback="아직 정리할 작업 기록이 충분하지 않습니다." />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="완료한 작업" value={report.my_work.tasks.length} />
          <Stat label="내 지시" value={c.prompts} />
          <Stat label="명령 실행" value={c.shells} />
          <Stat label="실패 후 재시도" value={c.failed_shells} warn={c.failed_shells > 0} />
        </div>
        {(report.my_work.tasks.length > 0 || prompts.length > 0 || report.my_work.files.length > 0) && (
          <Toggle label="작업 기록 자세히 보기">
            <div className="space-y-5">
              {report.my_work.tasks.length > 0 && (
                <div>
                  <SubLabel>완료한 작업</SubLabel>
                  <ul className="space-y-1.5 text-[15px]">
                    {report.my_work.tasks.map((t) => (
                      <li key={t.name}>
                        {t.success ? "✅" : "⚠️"} {t.name.replace(/^\d+\.\s*/, "")}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {prompts.length > 0 && (
                <div>
                  <SubLabel>내가 내린 지시 (최근 {Math.min(prompts.length, 8)}개)</SubLabel>
                  <ul className="space-y-1.5">
                    {prompts.slice(0, 8).map((p) => (
                      <li key={p.at} className="text-sm leading-6 text-zinc-700">
                        <span className="mr-2 text-zinc-300">“</span>
                        {clip(p.text, 80)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {report.my_work.files.length > 0 && (
                <div>
                  <SubLabel>수정한 파일</SubLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {report.my_work.files.map((f) => (
                      <span key={f} className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-xs text-zinc-700">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Toggle>
        )}
      </Section>

      {/* 3. 겪은 어려움 */}
      <Section icon="🧗" title="겪은 어려움">
        <Prose
          text={summary?.difficulties}
          loading={loading}
          fallback="아직 트러블 카드가 없습니다. 작업 중 실패했다가 해결하면 태스크가 끝날 때 자동으로 만들어집니다."
        />
        {report.troubles.length > 0 && (
          <ul className="space-y-2">
            {report.troubles.map((t, i) => (
              <li key={t.id}>
                <Link
                  href={`/cards/${t.id}`}
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 px-4 py-3 hover:bg-zinc-50"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-50 text-xs font-semibold text-rose-600">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-zinc-900">{t.title}</span>
                  <span className="text-xs text-zinc-400">카드 보기 →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* 4. 어떻게 해결했나 */}
      <Section icon="🛠️" title="어떻게 해결했나">
        <Prose text={summary?.solutions} loading={loading} fallback="아직 해결 기록이 없습니다." />
        {report.solutions.length > 0 && (
          <Toggle label="트러블별 해결 과정 자세히 보기">
            <ol className="space-y-4">
              {report.solutions.map((s, i) => (
                <li key={s.id} className="text-sm leading-6 text-zinc-700">
                  <div className="font-semibold text-zinc-900">
                    {i + 1}. {s.title}
                  </div>
                  <p className="mt-1">
                    <span className="mr-1.5 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500">행동</span>
                    {s.action}
                  </p>
                  <p className="mt-1">
                    <span className="mr-1.5 rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">결과</span>
                    {s.needs_check?.includes("result") ? <span className="text-amber-600">확인 필요</span> : s.result}
                  </p>
                </li>
              ))}
            </ol>
          </Toggle>
        )}
      </Section>
    </article>
  );
}
