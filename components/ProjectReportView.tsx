"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// 프로젝트 전체 보고서: GET /api/projects/[name]/report 로 기록을 4단으로 보여 준다.
// "AI로 문장 다듬기"는 POST 로 같은 기록을 포트폴리오 문단으로 바꾼다. "PDF로 저장"은 브라우저 인쇄.
type Report = {
  project_name: string;
  period: { start: string | null; end: string | null };
  counts: { events: number; prompts: number; shells: number; failed_shells: number; files: number; cards: number };
  overview: { requirements: string };
  my_work: { tasks: { name: string; success: boolean; at: string }[]; prompts: { text: string; at: string }[]; files: string[] };
  troubles: { id: string; title: string; situation: string; task: string }[];
  solutions: { id: string; title: string; action: string; result: string; needs_check: string[] }[];
};
type Summary = { overview: string; my_work: string; difficulties: string; solutions: string };

function fmt(t: string | null) {
  return t ? new Date(t).toLocaleString("ko-KR") : "-";
}

function Section({ no, title, children }: { no: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 break-inside-avoid">
      <h2 className="text-lg font-semibold">
        {no}. {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-zinc-800">{children}</div>
    </section>
  );
}

function AiText({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="rounded bg-violet-50 p-3 text-zinc-900">{text}</p>;
}

export default function ProjectReportView({ name }: { name: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(name)}/report`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `보고서 조회 실패 (HTTP ${res.status})`);
        if (!ignore) setReport(json.data as Report);
      } catch (e) {
        if (!ignore) setError(e instanceof Error ? e.message : "보고서를 불러오지 못했습니다.");
      }
    })();
    return () => {
      ignore = true;
    };
  }, [name]);

  async function makeSummary() {
    setSummarizing(true);
    setSummaryError(null);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(name)}/report`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `AI 문장 생성 실패 (HTTP ${res.status})`);
      setSummary(json.data as Summary);
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : "AI 문장 생성 실패");
    } finally {
      setSummarizing(false);
    }
  }

  if (error) return <p className="mt-6 rounded bg-red-50 p-3 text-sm text-red-700">오류: {error}</p>;
  if (!report) return <p className="mt-6 text-zinc-500">불러오는 중...</p>;

  const c = report.counts;
  return (
    <article className="mt-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{report.project_name} 프로젝트 보고서</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {fmt(report.period.start)} ~ {fmt(report.period.end)} · 기록 {c.events}건
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button
            onClick={makeSummary}
            disabled={summarizing}
            className="rounded border border-violet-600 px-3 py-2 text-sm text-violet-700 disabled:opacity-40"
          >
            {summarizing ? "AI가 정리하는 중... (최대 1분)" : "AI로 문장 다듬기"}
          </button>
          <button onClick={() => window.print()} className="rounded bg-black px-3 py-2 text-sm text-white">
            PDF로 저장
          </button>
        </div>
      </div>
      {summaryError && <p className="mt-3 text-sm text-red-600 print:hidden">오류: {summaryError}</p>}

      <Section no={1} title="이 프로젝트는">
        <AiText text={summary?.overview} />
        {report.overview.requirements ? (
          <pre className="whitespace-pre-wrap rounded border border-zinc-200 bg-zinc-50 p-3 font-sans text-xs text-zinc-700">
            {report.overview.requirements}
          </pre>
        ) : (
          <p className="text-zinc-500">
            아직 spec 태스크 기록이 없습니다. 이 저장소에서 Kiro spec 태스크를 실행하면 요구사항이 자동으로 채워집니다.
            지금까지의 기록으로 개요를 보려면 위의 &quot;AI로 문장 다듬기&quot;를 누르세요.
          </p>
        )}
      </Section>

      <Section no={2} title="내가 한 일">
        <AiText text={summary?.my_work} />
        <p className="text-zinc-600">
          지시 {c.prompts}건 · 명령 실행 {c.shells}번(실패 {c.failed_shells}번) · 수정한 파일 {c.files}개
        </p>
        {report.my_work.tasks.length === 0 && (
          <p className="text-zinc-500">완료한 spec 작업: 아직 없음 (spec 태스크가 끝나면 여기에 쌓입니다)</p>
        )}
        {report.my_work.tasks.length > 0 && (
          <div>
            <div className="font-medium">완료한 작업</div>
            <ul className="mt-1 list-disc pl-5">
              {report.my_work.tasks.map((t) => (
                <li key={t.name}>
                  {t.name} {t.success ? "✅" : "⚠️ 실패로 끝남"}
                </li>
              ))}
            </ul>
          </div>
        )}
        {report.my_work.prompts.length > 0 && (
          <div>
            <div className="font-medium">내가 내린 지시와 판단</div>
            <ul className="mt-1 list-disc pl-5">
              {report.my_work.prompts.map((p) => (
                <li key={p.at}>{p.text}</li>
              ))}
            </ul>
          </div>
        )}
        {report.my_work.files.length > 0 && (
          <div>
            <div className="font-medium">수정한 파일</div>
            <p className="mt-1 font-mono text-xs text-zinc-600">{report.my_work.files.join(", ")}</p>
          </div>
        )}
      </Section>

      <Section no={3} title="겪은 어려움">
        <AiText text={summary?.difficulties} />
        {report.troubles.length === 0 && (
          <p className="text-zinc-500">
            정리된 트러블 카드가 아직 없습니다. 작업 중 실패했다가 해결한 흐름이 있으면, 태스크가 끝날 때 카드가 자동으로 만들어집니다.
          </p>
        )}
        {report.troubles.map((t, i) => (
          <div key={t.id} className="rounded border border-zinc-200 p-3">
            <Link href={`/cards/${t.id}`} className="font-medium underline-offset-2 hover:underline">
              {i + 1}. {t.title}
            </Link>
            <p className="mt-1">{t.situation}</p>
            <p className="mt-1 text-zinc-600">과제: {t.task}</p>
          </div>
        ))}
      </Section>

      <Section no={4} title="어떻게 해결했나">
        <AiText text={summary?.solutions} />
        {report.solutions.length === 0 && (
          <p className="text-zinc-500">아직 해결 기록이 없습니다. 트러블 카드가 생기면 해결 방법과 결과가 여기에 정리됩니다.</p>
        )}
        {report.solutions.map((s, i) => (
          <div key={s.id} className="rounded border border-zinc-200 p-3">
            <div className="font-medium">
              {i + 1}. {s.title}
            </div>
            <p className="mt-1">{s.action}</p>
            <p className="mt-1 text-zinc-600">
              결과: {s.result}
              {s.needs_check?.length > 0 && <span className="ml-1 text-amber-600">(확인 필요)</span>}
            </p>
          </div>
        ))}
      </Section>
    </article>
  );
}
