import Link from "next/link";
import PlayerRowActions from "./PlayerRowActions";
import { findProfileByUsername } from "@/data/player-profiles";

interface PlayerCardProps {
  id: string;
  avatar: string;
  name: string;
  context: string;
}

export default function PlayerCard({ id, avatar, name, context }: PlayerCardProps) {
  const profile = findProfileByUsername(name);

  return (
    <div className="flex w-full items-center gap-2.5 rounded-xl p-2.5 transition-colors hover:bg-white/5">
      {/* eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail, no benefit from next/image optimization */}
      <img
        src={avatar}
        alt=""
        className="size-9 shrink-0 rounded-full object-cover"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {profile ? (
          <Link
            href={`/profile/${profile.slug}`}
            className="truncate text-[13px] font-bold text-white transition-colors hover:text-brand"
          >
            {name}
          </Link>
        ) : (
          <span className="truncate text-[13px] font-bold text-white">{name}</span>
        )}
        <span className="truncate text-[11px] text-text-muted">{context}</span>
      </div>

      <PlayerRowActions target={{ id, name, avatar }} />
    </div>
  );
}
