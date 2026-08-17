/**
 * Shared by the create-lobby form and signup. Region is a matchmaking
 * input, not just profile decoration — lobbies are filtered by it.
 */
export const regions = ["SG2", "NA East", "EU West"] as const;

export type Region = (typeof regions)[number];

export const defaultRegion: Region = "SG2";
