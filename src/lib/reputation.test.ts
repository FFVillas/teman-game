import { describe, expect, it } from "vitest";
import { testGame, testTeam } from "@/test/fixtures";
import { parseLobbyFilters } from "./lobby-filters";
import { filterLobbies } from "./lobby-ranking";
import { isNewPlayer, sanctionDates } from "./reputation";

describe("isNewPlayer", () => {
  it("labels anyone rated by fewer than five different players", () => {
    expect(isNewPlayer(0)).toBe(true);
    expect(isNewPlayer(4)).toBe(true);
    expect(isNewPlayer(5)).toBe(false);
  });
});

describe("sanctionDates", () => {
  const issuedAt = "2026-11-12T05:00:00Z";

  it("shows one date for a warning", () => {
    expect(
      sanctionDates({ type: "warning", reason: "", issuedAt, expiresAt: null, active: false }),
    ).toBe("12 Nov 2026");
  });

  it("shows the span of a suspension", () => {
    expect(
      sanctionDates({
        type: "suspension",
        reason: "",
        issuedAt,
        expiresAt: "2026-11-19T05:00:00Z",
        active: true,
      }),
    ).toBe("12 Nov 2026 – 19 Nov 2026");
  });
});

describe("suspended players", () => {
  it("are left out of the lobby list before anything is scored", () => {
    const teams = [testTeam({ id: "ok" }), testTeam({ id: "suspended", leaderSuspended: true })];
    const visible = filterLobbies(teams, parseLobbyFilters({ rank: "all" }), testGame, null);
    expect(visible.map((team) => team.id)).toEqual(["ok"]);
  });
});
