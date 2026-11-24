"use client";

import { useCallback, useEffect, useState } from "react";
import type { LobbyReview } from "@/components/lobby/RatingModal";
import { useAuth } from "@/contexts/AuthContext";
import type { ReportSubmission } from "@/data/lfg-lobby";
import type { PersonalityTag } from "@/data/player-profiles";
import { submitReport } from "@/lib/reports";
import { submitReview } from "@/lib/reviews";
import { createClient } from "@/lib/supabase/client";
import { fetchTagCatalog, fetchTagStrengths, tagsByStrength } from "@/lib/tags";

/**
 * What the rating queue needs to save for real: the personality tags in
 * each teammate's own order (strongest first, nothing picked for you, as the
 * proposal asks), and the two writes, a rating and a report.
 */
export function useRating(lobbyId: string, teammateIds: string[]) {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState<{ id: number; name: PersonalityTag }[]>([]);
  const [strengths, setStrengths] = useState<Map<string, Map<number, number>>>(new Map());
  const idsKey = teammateIds.join(",");

  useEffect(() => {
    if (!idsKey) return;
    let cancelled = false;
    const supabase = createClient();
    Promise.all([fetchTagCatalog(supabase), fetchTagStrengths(supabase, idsKey.split(","))]).then(
      ([tags, byUser]) => {
        if (cancelled) return;
        setCatalog(tags);
        setStrengths(byUser);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  const tagsFor = useCallback(
    (teammateId: string): string[] => tagsByStrength(catalog, strengths.get(teammateId)),
    [catalog, strengths],
  );

  const saveReview = useCallback(
    (review: LobbyReview) =>
      submitReview(createClient(), {
        lobbyId,
        rateeId: review.targetId,
        stars: review.stars,
        reason: review.reason,
        tagIds: catalog.filter((tag) => review.tags.includes(tag.name)).map((tag) => tag.id),
      }),
    [catalog, lobbyId],
  );

  const saveReport = useCallback(
    async (report: ReportSubmission) => {
      if (!user) return "Log in to report players.";
      return submitReport(createClient(), user.id, { ...report, lobbyId });
    },
    [lobbyId, user],
  );

  return { tagsFor, saveReview, saveReport };
}
