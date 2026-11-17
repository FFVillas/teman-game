import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Filing a report (`reports`, 20260919000200 and 20261118000100). A report
 * opens a ticket for a moderator; it never changes anyone's rating. Evidence
 * files go to the private `report-evidence` bucket under the reporter's own
 * folder, and only the reporter and admins can read them.
 */

export interface ReportInput {
  targetId: string;
  reason: string;
  details: string;
  lobbyId?: string;
  evidenceUrl?: string;
  evidenceFile?: File;
}

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "video/mp4": "mp4",
};

/** Returns an error message, or null when the report was filed. */
export async function submitReport(
  supabase: SupabaseClient,
  reporterId: string,
  input: ReportInput,
): Promise<string | null> {
  let evidencePath: string | null = null;
  if (input.evidenceFile) {
    const extension = EXTENSIONS[input.evidenceFile.type];
    if (!extension) return "Evidence must be a PNG, JPG or MP4 file.";
    evidencePath = `${reporterId}/${Date.now()}.${extension}`;
    const { error } = await supabase.storage
      .from("report-evidence")
      .upload(evidencePath, input.evidenceFile, { contentType: input.evidenceFile.type });
    if (error) return "Couldn't upload the evidence file. Try again, or paste a link instead.";
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: reporterId,
    target_id: input.targetId,
    lobby_id: input.lobbyId ?? null,
    reason: input.reason,
    details: input.details,
    evidence_url: input.evidenceUrl ?? null,
    evidence_path: evidencePath,
  });
  if (!error) return null;
  if (error.message.includes("reports_not_self")) return "You can't report yourself.";
  return "Couldn't send the report. Try again.";
}
