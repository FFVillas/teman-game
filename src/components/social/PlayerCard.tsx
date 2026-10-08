import Link from "next/link";
import UserAvatar from "@/components/UserAvatar";
import PlayerRowActions from "./PlayerRowActions";
import { profileHrefFor } from "@/data/profile-lookup";

interface PlayerCardProps {
  id: string;
  avatar: string;
  name: string;
  context?: string;
  /** `id` is a real profile id — see PlayerRowActions. */
  real?: boolean;
  onBlocked?: () => void;
}

export default function PlayerCard({
  id,
  avatar,
  name,
  context,
  real = false,
  onBlocked,
}: PlayerCardProps) {
  return (
    <div className="group relative flex w-full items-center gap-2.5 rounded-xl p-2.5 transition-colors hover:bg-white/5">
      <UserAvatar src={avatar} name={name} className="size-9" />

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
        {context && (
          <span className="truncate text-[11px] text-text-muted">
            {context}
          </span>
        )}
      </div>

      <PlayerRowActions
        target={{ id, name, avatar }}
        real={real}
        onBlocked={onBlocked}
      />
    </div>
  );
}
