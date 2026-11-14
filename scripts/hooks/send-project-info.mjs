// 프로젝트 설명 전송: 저장소의 README.md, .kiro/steering/product.md, package.json(이름·설명)을 읽어
// project_info 이벤트로 보낸다. 보고서의 "1. 이 프로젝트는"에 쓰인다.
// install.sh가 설치 마지막에 한 번 실행한다. 다시 실행하면 최신 내용으로 갱신된다(보고서는 가장 최근 것을 쓴다).
// 사용: 대상 저장소 폴더에서  node scripts/hooks/send-project-info.mjs
// send-event.mjs와 같이 어떤 경우에도 정상 종료한다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sendEvent } from "./send-event.mjs";

const cwd = process.cwd();
const read = (p) => {
  try {
    return readFileSync(join(cwd, p), "utf8");
  } catch {
    return "";
  }
};
// steering 문서 맨 위의 front matter(--- inclusion ... ---)는 뺀다.
const stripFrontMatter = (t) => t.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();

let pkg = {};
try {
  pkg = JSON.parse(read("package.json") || "{}");
} catch {
  pkg = {};
}

const payload = {
  readme: read("README.md").trim().slice(0, 4000),
  product: stripFrontMatter(read(".kiro/steering/product.md")).slice(0, 4000),
  package_name: typeof pkg.name === "string" ? pkg.name : "",
  package_description: typeof pkg.description === "string" ? pkg.description : "",
};

try {
  if (payload.readme || payload.product || payload.package_description) {
    const ok = await sendEvent({ source: "kiro", session_id: "project-info", type: "project_info", payload }, cwd);
    console.log(ok ? "프로젝트 설명을 보냈습니다." : "프로젝트 설명 전송에 실패했습니다. (서버가 꺼져 있으면 나중에 다시 실행하세요)");
  } else {
    console.log("README.md, .kiro/steering/product.md, package.json 설명이 없어 보내지 않았습니다.");
  }
} catch {
  // 어떤 경우에도 정상 종료
}
