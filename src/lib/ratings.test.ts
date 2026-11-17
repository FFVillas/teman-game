import { describe, expect, it } from "vitest";
import { pendingReviews, type MatchRecord } from "@/data/match-history";
import { tagsByStrength } from "./tags";

const catalog = [
  { id: 1, name: "Shot Caller" },
  { id: 2, name: "Positive Mental Attitude" },
  { id: 3, name: "Chill" },
] as const;

describe("tagsByStrength", () => {
  it("puts the player's strongest tags first", () => {
    const strengths = new Map([
      [3, 1],
      [1, 0.4],
    ]);
    expect(tagsByStrength(catalog, strengths)).toEqual([
      "Chill",
      "Shot Caller",
      "Positive Mental Attitude",
    ]);
  });

  it("keeps the catalog order when nothing is known", () => {
    expect(tagsByStrength(catalog, undefined)).toEqual([
      "Shot Caller",
      "Positive Mental Attitude",
      "Chill",
    ]);
  });
});

describe("pendingReviews", () => {
  const match = (rateable: boolean | undefined): MatchRecord => ({
    id: "m",
    lobbyName: "",
    lobbyType: "",
    game: "valorant",
    cover: "",
    mode: "casual",
    region: "",
    endedOn: "",
    endedAgo: "",
    duration: "",
    viewerWasLeader: false,
    rateable,
    teammates: [
      { id: "a", name: "a", avatar: "", wasLeader: false, reviewed: true },
      { id: "b", name: "b", avatar: "", wasLeader: false, reviewed: false },
    ],
  });

  it("lists teammates not rated yet", () => {
    expect(pendingReviews(match(true)).map((teammate) => teammate.id)).toEqual(["b"]);
  });

  it("is empty when the lobby ran under 15 minutes", () => {
    expect(pendingReviews(match(false))).toEqual([]);
  });

  it("treats mock matches (no flag) as rateable", () => {
    expect(pendingReviews(match(undefined))).toHaveLength(1);
  });
});
