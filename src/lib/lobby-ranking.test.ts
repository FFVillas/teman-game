import { describe, expect, it } from "vitest";
import type { PersonalityTag } from "@/data/player-profiles";
import { testGame, testTeam } from "@/test/fixtures";
import {
  ANY_RANK,
  FITS_MY_RANK,
  filtersToQuery,
  parseLobbyFilters,
  type LobbyFilters,
} from "./lobby-filters";
import { filterLobbies, scoreLobby, sortLobbies, type Viewer } from "./lobby-ranking";

const noFilters: LobbyFilters = parseLobbyFilters({});

function viewer(overrides: Partial<Viewer> = {}): Viewer {
  return {
    playstyle: 3,
    rankOrdinal: 2, // Gold 1
    rankName: "Gold 1",
    tagStrength: new Map(),
    ...overrides,
  };
}

const tagNames = new Map<number, PersonalityTag>([
  [1, "Shot Caller"],
  [3, "Chill"],
]);

describe("parseLobbyFilters", () => {
  it("defaults to recommended order and 'Fits my rank'", () => {
    expect(noFilters).toEqual({
      query: "",
      region: "",
      mode: "",
      rank: FITS_MY_RANK,
      role: "",
      sort: "recommended",
    });
  });

  it("ignores an unknown sort and takes the first of repeated params", () => {
    const filters = parseLobbyFilters({ sort: "cheapest", region: ["AP", "EU"] });
    expect(filters.sort).toBe("recommended");
    expect(filters.region).toBe("AP");
  });

  it("round-trips through the URL, leaving defaults out", () => {
    expect(filtersToQuery(noFilters)).toBe("");
    const filters = { ...noFilters, role: "Duelist", rank: ANY_RANK, sort: "latest" as const };
    expect(parseLobbyFilters(Object.fromEntries(new URLSearchParams(filtersToQuery(filters))))).toEqual(
      filters,
    );
  });
});

describe("filterLobbies", () => {
  const run = (teams = [testTeam()], filters: Partial<LobbyFilters> = {}, who: Viewer | null = viewer()) =>
    filterLobbies(teams, { ...noFilters, ...filters }, testGame, who).map((team) => team.id);

  it("keeps lobbies that name no role when a role is picked (role is optional)", () => {
    const open = testTeam({ id: "open" });
    const duelist = testTeam({ id: "duelist", lookingFor: [{ name: "Duelist", icon: "" }] });
    const sentinel = testTeam({ id: "sentinel", lookingFor: [{ name: "Sentinel", icon: "" }] });
    expect(run([open, duelist, sentinel], { role: "Duelist" })).toEqual(["open", "duelist"]);
  });

  it("filters by region, mode and text", () => {
    const a = testTeam({ id: "a", region: "AP", modeValue: "unrated", name: "Chill night" });
    const b = testTeam({ id: "b", region: "EU", modeValue: "competitive", name: "Grind" });
    expect(run([a, b], { region: "EU" })).toEqual(["b"]);
    expect(run([a, b], { mode: "unrated" })).toEqual(["a"]);
    expect(run([a, b], { query: "chill" })).toEqual(["a"]);
  });

  it("'Fits my rank' hides a lobby whose range is above the viewer", () => {
    const platinum = testTeam({ id: "plat", rankRange: { from: "Platinum", to: "" } });
    const any = testTeam({ id: "any" });
    expect(run([platinum, any])).toEqual(["any"]);
    expect(run([platinum, any], { rank: ANY_RANK })).toEqual(["plat", "any"]);
  });

  it("applies the game's party rule to who is already in", () => {
    // Competitive allows one tier apart; a Platinum member closes it to Silver.
    const team = testTeam({ id: "ranked", modeValue: "competitive", memberOrdinals: [4] });
    expect(run([team], {}, viewer({ rankOrdinal: 0 }))).toEqual([]);
    expect(run([team], {}, viewer({ rankOrdinal: 2 }))).toEqual(["ranked"]);
  });

  it("lets an unranked or signed-out viewer see every lobby", () => {
    const platinum = testTeam({ id: "plat", rankRange: { from: "Platinum", to: "" } });
    expect(run([platinum], {}, viewer({ rankOrdinal: null }))).toEqual(["plat"]);
    expect(run([platinum], {}, null)).toEqual(["plat"]);
  });

  it("a picked tier shows lobbies that accept it", () => {
    const silverGold = testTeam({ id: "low", rankRange: { from: "Silver", to: "Gold" } });
    expect(run([silverGold], { rank: "Gold" })).toEqual(["low"]);
    expect(run([silverGold], { rank: "Platinum" })).toEqual([]);
  });
});

describe("scoreLobby", () => {
  it("uses the lobby's playstyle, then the leader's", () => {
    const own = scoreLobby(testTeam({ playstyle: 5, leaderPlaystyle: 3 }), viewer({ playstyle: 5 }), tagNames);
    const fallback = scoreLobby(testTeam({ playstyle: null, leaderPlaystyle: 5 }), viewer({ playstyle: 5 }), tagNames);
    expect(own).toBeCloseTo(fallback!);
  });

  it("uses the mean reputation of the members (R_lobi)", () => {
    const good = scoreLobby(testTeam({ memberReputations: [5, 5] }), viewer(), tagNames)!;
    const mixed = scoreLobby(testTeam({ memberReputations: [5, 1] }), viewer(), tagNames)!;
    expect(good).toBeGreaterThan(mixed);
    // P = 1, R = 0.5, no wanted tags: (0.4 + 0.15) / 0.7.
    expect(mixed).toBeCloseTo((0.4 + 0.15) / 0.7);
  });

  it("scores wanted tags by the viewer's tag strength", () => {
    const team = testTeam({ wantedTagIds: [1, 3] });
    const strong = viewer({ tagStrength: new Map([["Shot Caller", 1], ["Chill", 1]]) });
    const half = viewer({ tagStrength: new Map([["Chill", 1]]) });
    expect(scoreLobby(team, strong, tagNames)).toBeCloseTo(0.4 + 0.3 * 0.5 + 0.3);
    expect(scoreLobby(team, half, tagNames)).toBeCloseTo(0.4 + 0.3 * 0.5 + 0.15);
  });

  it("is null for a viewer with no playstyle", () => {
    expect(scoreLobby(testTeam(), viewer({ playstyle: null }), tagNames)).toBeNull();
  });
});

describe("sortLobbies", () => {
  const teams = ["a", "b", "c"].map((id, index) =>
    testTeam({ id, slotsFilled: index + 1, slotsTotal: 5 }),
  );

  it("orders by score, keeping arrival order for ties and unscored last", () => {
    const scores: Record<string, number | null> = { a: 0.5, b: 0.9, c: 0.5 };
    const sorted = sortLobbies(teams, "recommended", (team) => scores[team.id]);
    expect(sorted.map((team) => team.id)).toEqual(["b", "a", "c"]);

    const withUnscored = sortLobbies(teams, "recommended", (team) =>
      team.id === "a" ? null : 0.1,
    );
    expect(withUnscored.map((team) => team.id)).toEqual(["b", "c", "a"]);
  });

  it("supports the other sorts", () => {
    const byId = (sort: Parameters<typeof sortLobbies>[1]) =>
      sortLobbies(teams, sort, () => null).map((team) => team.id);
    expect(byId("latest")).toEqual(["a", "b", "c"]);
    expect(byId("players")).toEqual(["c", "b", "a"]);
    expect(byId("open-slots")).toEqual(["a", "b", "c"]);
  });
});
