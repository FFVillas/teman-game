export interface PendingRequest {
  id: string;
  name: string;
  avatar: string;
  sentAgo: string;
}

export const pendingRequests: PendingRequest[] = [
  { id: "p1", name: "VoidWalker", avatar: "/lfg/avatars/avatar-6.jpg", sentAgo: "2 days ago" },
  { id: "p2", name: "MysticFrost", avatar: "/lfg/avatars/avatar-7.jpg", sentAgo: "5 hours ago" },
  { id: "p3", name: "IronClad99", avatar: "/lfg/avatars/avatar-2.jpg", sentAgo: "1 week ago" },
];
