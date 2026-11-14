import { describe, expect, it } from "vitest";
import { saveSchedule } from "../src/schedule";

describe("saveSchedule", () => {
  it("keeps the date for a midday event in Korea (KST)", () => {
    const saved = saveSchedule({
      title: "팀 미팅",
      startsAt: new Date("2026-11-20T12:00:00+09:00"),
      timeZone: "Asia/Seoul",
    });

    expect(saved.date).toBe("2026-11-20");
  });

  it("keeps the date for an event just after midnight in Korea (00:30 KST)", () => {
    const saved = saveSchedule({
      title: "새벽 스터디",
      startsAt: new Date("2026-11-20T00:30:00+09:00"),
      timeZone: "Asia/Seoul",
    });

    expect(saved.date).toBe("2026-11-20");
  });

  it("uses the user's own timezone for an event near midnight elsewhere (23:30 PST)", () => {
    const saved = saveSchedule({
      title: "Late call",
      startsAt: new Date("2026-11-20T23:30:00-08:00"),
      timeZone: "America/Los_Angeles",
    });

    expect(saved.date).toBe("2026-11-20");
  });
});
