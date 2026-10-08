export interface SocialUser {
  name: string;
  avatar: string;
}

// Fallback identity for the Social section and Messages when signed out —
// friends/pending/discover themselves are real now (src/lib/social.ts).
export const currentUser: SocialUser = {
  name: "Yonziii",
  avatar: "/lfg/avatars/avatar-1.jpg",
};
