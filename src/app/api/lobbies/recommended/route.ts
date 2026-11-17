import { NextResponse, type NextRequest } from "next/server";
import { fetchGameCatalog } from "@/lib/games";
import { parseLobbyFilters } from "@/lib/lobby-filters";
import { recommendLobbies } from "@/lib/lobby-ranking";
import { createClient, getUserId } from "@/lib/supabase/server";

/**
 * The ranked lobby list as JSON: `GET /api/lobbies/recommended?game=valorant`
 * with the same filters as the LFG page (`q`, `region`, `mode`, `rank`,
 * `role`, `sort`). The page renders the list itself; this exists so the list
 * can be measured on its own (k6, the non-functional evaluation) and checked
 * for Precision@5. Like the page, it returns the order only, never the scores.
 */
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const supabase = await createClient();
  const [catalog, userId] = await Promise.all([fetchGameCatalog(supabase), getUserId()]);
  const game = catalog.find((entry) => entry.slug === params.game);
  if (!game) {
    return NextResponse.json({ error: "unknown_game" }, { status: 404 });
  }

  const { lobbies } = await recommendLobbies(
    supabase,
    game,
    userId,
    parseLobbyFilters(params),
  );

  return NextResponse.json({
    game: game.slug,
    signedIn: Boolean(userId),
    lobbies: lobbies.map((lobby, index) => ({
      position: index + 1,
      id: lobby.id,
      name: lobby.name,
      mode: lobby.modeValue ?? null,
      region: lobby.region,
      slotsFilled: lobby.slotsFilled,
      slotsTotal: lobby.slotsTotal,
    })),
  });
}
