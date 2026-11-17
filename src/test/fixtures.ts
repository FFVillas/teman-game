import type { LfgTeam } from "@/data/lfg-teams";
import type { GameInfo } from "@/lib/games";

/**
 * A small game for tests: three tiers of two divisions (ordinals 0–5), two
 * roles, a ranked mode with a one-tier party rule and a casual mode with none.
 */
export const testGame: GameInfo = {
  id: 1,
  slug: "valorant",
  name: "Valorant",
  platform: "pc",
  genre: "fps",
  ranks: ["Silver", "Gold", "Platinum"].flatMap((tier, index) =>
    [1, 2].map((division) => ({
      id: index * 2 + division,
      tier,
      name: `${tier} ${division}`,
      ordinal: index * 2 + division - 1,
      partyBand: null,
    })),
  ),
  roles: [
    { id: 1, name: "Duelist" },
    { id: 2, name: "Sentinel" },
  ],
  modes: [
    {
      id: 1,
      value: "competitive",
      label: "Competitive",
      kind: "ranked",
      maxParty: 5,
      rotating: false,
      partyRule: "tiers",
      partyMaxApart: 1,
      partyRuleMaxCapacity: null,
    },
    {
      id: 2,
      value: "unrated",
      label: "Unrated",
      kind: "casual",
      maxParty: 5,
      rotating: false,
      partyRule: "none",
      partyMaxApart: null,
      partyRuleMaxCapacity: null,
    },
  ],
};

/** A real-looking lobby with sensible defaults; override what a test needs. */
export function testTeam(overrides: Partial<LfgTeam> = {}): LfgTeam {
  return {
    id: "lobby",
    name: "Test Lobby",
    game: "valorant",
    cover: "",
    mode: "casual",
    modeValue: "unrated",
    status: { label: "Active Now", isLive: true },
    region: "AP",
    members: [{ id: "leader", avatar: "" }],
    slotsFilled: 1,
    slotsTotal: 5,
    leaderId: "leader",
    leaderName: "leader",
    rank: { name: "Gold 1", icon: "", colorClass: "" },
    memberOrdinals: [],
    lookingFor: [],
    playstyle: 3,
    leaderPlaystyle: 3,
    memberReputations: [3],
    wantedTagIds: [],
    ...overrides,
  };
}
