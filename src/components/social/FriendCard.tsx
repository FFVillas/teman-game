import Link from "next/link";
import UserAvatar from "@/components/UserAvatar";
import PlayerRowActions from "./PlayerRowActions";
import { profileHrefFor } from "@/data/profile-lookup";

interface FriendCardProps {
  id: string;
  name: string;
  avatar: string;
  onBlocked?: () => void;
}

/**
 * No online/idle status: that needs a realtime presence channel, a separate
 * feature from the friendship itself (see 20261007010000_social.sql).
 * Showing a status here without tracking it for real would be exactly the
 * kind of invented-looking data this product is supposed to avoid.
 */
export default function FriendCard({ id, name, avatar, onBlocked }: FriendCardProps) {
  return (
    <div className="group relative flex w-full items-center gap-2.5 rounded-xl p-2.5 transition-colors hover:bg-white/5">
      <UserAvatar src={avatar} name={name} className="size-9" />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Full-row link — see PlayerCard for why it's done with ::after. */}
        <Link
          href={profileHrefFor(name)}
          className="truncate text-[13px] font-bold text-white transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-brand"
        >
          {name}
        </Link>
      </div>

      <PlayerRowActions
        target={{ id, name, avatar }}
        isFriend
        real
        onBlocked={onBlocked}
      />
    </div>
  );
}
