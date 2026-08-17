export type FriendStatus = "online" | "idle" | "offline";

export interface Friend {
  id: string;
  name: string;
  avatar: string;
  status: FriendStatus;
}

export interface SocialUser {
  name: string;
  avatar: string;
}

// Same identity used as a team leader in src/data/lfg-teams.ts — kept
// consistent across the LFG page, the Navbar's logged-in state, and here.
export const currentUser: SocialUser = {
  name: "Yonziii",
  avatar: "/lfg/avatars/avatar-1.jpg",
};

export const onlineFriends: Friend[] = [
  { id: "f1", name: "ShadowStrike", avatar: "/lfg/avatars/avatar-2.jpg", status: "online" },
  { id: "f2", name: "HealerMain", avatar: "/lfg/avatars/avatar-3.jpg", status: "online" },
  { id: "f3", name: "NoScopeGod", avatar: "/lfg/avatars/avatar-4.jpg", status: "online" },
  { id: "f4", name: "SneakyBeaky", avatar: "/lfg/avatars/avatar-5.jpg", status: "idle" },
];

export const offlineFriends: Friend[] = [
  { id: "f5", name: "CarryPotter", avatar: "/lfg/avatars/avatar-6.jpg", status: "offline" },
  { id: "f6", name: "NightOwl", avatar: "/lfg/avatars/avatar-7.jpg", status: "offline" },
  { id: "f7", name: "QuickScope", avatar: "/lfg/avatars/avatar-2.jpg", status: "offline" },
  { id: "f8", name: "GhostRecon", avatar: "/lfg/avatars/avatar-3.jpg", status: "offline" },
  { id: "f9", name: "PixelPirate", avatar: "/lfg/avatars/avatar-4.jpg", status: "offline" },
  { id: "f10", name: "LagSwitch", avatar: "/lfg/avatars/avatar-5.jpg", status: "offline" },
];
