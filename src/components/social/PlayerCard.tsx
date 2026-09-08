import Link from "next/link";
import PlayerRowActions from "./PlayerRowActions";
import { profileHrefFor } from "@/data/profile-lookup";

interface PlayerCardProps {
  id: string;
  avatar: string;
  name: string;
  context: string;
}

export default function PlayerCard({ id, avatar, name, context }: PlayerCardProps) {
  return (
    <div className="group relative flex w-full items-center gap-2.5 rounded-xl p-2.5 transition-colors hover:bg-white/5">
      {/* eslint-disable-next-line @next/next/no-img-element -- small avatar thumbnail, no benefit from next/image optimization */}
      <img
        src={avatar}
        alt=""
        className="size-9 shrink-0 rounded-full object-cover"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/*
          The ::after stretches this link over the whole row, so clicking
          anywhere opens the profile — without nesting the action buttons
          inside an anchor, which would be invalid HTML.
        */}
        <Link
          href={profileHrefFor(name)}
          className="truncate text-[13px] font-bold text-white transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-brand"
        >
          {name}
        </Link>
        <span className="truncate text-[11px] text-text-muted">{context}</span>
      </div>

      <PlayerRowActions target={{ id, name, avatar }} />
    </div>
  );
}
