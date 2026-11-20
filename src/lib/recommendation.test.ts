import { describe, expect, it } from "vitest";
import {
  SCORE_WEIGHTS,
  lobbyReputation,
  playstyleScore,
  reputationScore,
  scoreMatch,
  tagScore,
  totalScore,
} from "./recommendation";

describe("weights (Persamaan 3.1)", () => {
  it("sum to 1, so S_total stays within 0–1", () => {
    const sum = SCORE_WEIGHTS.playstyle + SCORE_WEIGHTS.reputation + SCORE_WEIGHTS.tags;
    expect(sum).toBeCloseTo(1);
  });
});

describe("P, playstyle (Persamaan 3.2)", () => {
  it("is 1 for the same playstyle", () => {
    expect(playstyleScore(4, 4)).toBe(1);
  });

  it("is 0 for opposite ends of the scale", () => {
    expect(playstyleScore(5, 1)).toBe(0);
  });

  it("drops a quarter per step", () => {
    expect(playstyleScore(2, 3)).toBe(0.75);
  });
});

describe("R, reputation (Persamaan 3.3)", () => {
  it("maps 1 to 5 stars onto 0 to 1", () => {
    expect(reputationScore(1)).toBe(0);
    expect(reputationScore(3)).toBe(0.5);
    expect(reputationScore(5)).toBe(1);
  });

  it("clamps values outside the star range", () => {
    expect(reputationScore(0)).toBe(0);
    expect(reputationScore(6)).toBe(1);
  });
});

describe("R_lobi (Persamaan 3.4)", () => {
  it("is the mean of everyone in the lobby", () => {
    expect(lobbyReputation([1, 0.5, 0])).toBe(0.5);
  });

  it("is 0 rather than NaN for an empty list", () => {
    expect(lobbyReputation([])).toBe(0);
  });
});

describe("T, personality (Persamaan 3.13–3.14)", () => {
  // The worked example in the proposal: Chill 1.00, Flex Player 0.67, PMA
  // 0.44, Shot Caller 0.11; a lobby wanting Chill and Flex Player gives 0.83.
  const strengths = new Map([
    ["Chill", 1],
    ["Flex Player", 6 / 9],
    ["Positive Mental Attitude", 4 / 9],
    ["Shot Caller", 1 / 9],
  ] as const);

  it("matches the proposal's example", () => {
    const T = tagScore(
      ["Chill", "Flex Player", "Positive Mental Attitude", "Shot Caller"],
      ["Chill", "Flex Player"],
      (tag) => strengths.get(tag as never) ?? 0,
    );
    expect(T).toBeCloseTo(0.83, 2);
  });

  it("counts a tag the applicant lacks as 0", () => {
    expect(tagScore(["Chill"], ["Chill", "Shot Caller"])).toBe(0.5);
  });

  it("does not penalise tags the lobby didn't ask for", () => {
    expect(tagScore(["Chill", "Shot Caller", "Flex Player"], ["Chill"])).toBe(1);
  });
});

describe("S_total (Persamaan 3.1 and 3.15)", () => {
  it("weights P, R and T 0.40 / 0.28 / 0.32", () => {
    expect(SCORE_WEIGHTS).toEqual({ playstyle: 0.4, reputation: 0.28, tags: 0.32 });
    expect(totalScore(1, 0.5, 0.5)).toBeCloseTo(0.4 + 0.14 + 0.16);
  });

  // The two examples the proposal prints under Persamaan 3.15, so BAB 4 can
  // cite them. The first passes under any weights — a weighted mean of equal
  // values ignores them — which is exactly why the old 0.40/0.30/0.30 split
  // went unnoticed. The second is the one that pins them down.
  it("matches the proposal's worked examples", () => {
    expect(totalScore(0.75, 0.75, null)).toBeCloseTo(0.75, 4);
    expect(totalScore(0.75, 0.75, 1)).toBeCloseTo(0.83, 4);
  });

  it("drops T and rescales when the lobby wants no tags", () => {
    expect(totalScore(1, 0.5, null)).toBeCloseTo((0.4 + 0.14) / 0.68);
  });

  it("never rewards a lobby for setting no criteria", () => {
    // A lobby whose wanted tags the applicant fully meets must not lose to an
    // otherwise identical lobby that wants nothing.
    expect(totalScore(1, 1, 1)).toBeGreaterThanOrEqual(totalScore(1, 1, null));
  });

  it("scoreMatch reports T as null for |B| = 0", () => {
    const result = scoreMatch(
      { playstyle: 3, reputation: 3, tags: ["Chill"], rankOrdinal: 0 },
      { playstyle: 3, wantedTags: [], rankOrdinal: 0 },
    );
    expect(result.T).toBeNull();
    expect(result.total).toBeCloseTo((0.4 * 1 + 0.28 * 0.5) / 0.68);
  });
});
