import { redirect } from "next/navigation";

// 프로젝트 목록은 메인 화면(/)으로 옮겼다. 예전 주소로 오면 메인으로 보낸다.
export default function ProjectsPage() {
  redirect("/");
}
