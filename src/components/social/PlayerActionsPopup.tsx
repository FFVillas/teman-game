interface PlayerActionsPopupProps {
  onClose: () => void;
  /** Shown for existing friends — swaps "Add Friend" for "Invite to Party",
   *  since you're already friends with the person this menu is for. */
  isFriend?: boolean;
}

export default function PlayerActionsPopup({
  onClose,
  isFriend = false,
}: PlayerActionsPopupProps) {
  return (
    <div
      role="menu"
      className="absolute left-0 top-[calc(100%+4px)] z-20 w-[154px] overflow-hidden rounded-xl border border-white/10 bg-bg-card-alt py-0.5 shadow-xl shadow-black/40"
    >
      <button
        type="button"
        role="menuitem"
        onClick={onClose}
        className="flex w-full items-center gap-2.5 px-3 py-1 text-left text-xs text-white transition-colors hover:bg-white/5"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path
            d="M2 3.5C2 2.67157 2.67157 2 3.5 2H12.5C13.3284 2 14 2.67157 14 3.5V9.5C14 10.3284 13.3284 11 12.5 11H5.5L2 14V3.5Z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Message
      </button>

      {isFriend ? (
        <button
          type="button"
          role="menuitem"
          onClick={onClose}
          className="flex w-full items-center gap-2.5 px-3 py-1 text-left text-xs text-white transition-colors hover:bg-white/5"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
            <path
              d="M8 5.5V10.5M5.5 8H10.5"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
          Invite to Party
        </button>
      ) : (
        <button
          type="button"
          role="menuitem"
          onClick={onClose}
          className="flex w-full items-center gap-2.5 px-3 py-1 text-left text-xs text-white transition-colors hover:bg-white/5"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
          <img src="/icons/social-add-friend.svg" alt="" className="size-3" />
          Add Friend
        </button>
      )}

      <button
        type="button"
        role="menuitem"
        onClick={onClose}
        className="flex w-full items-center gap-2.5 px-3 py-1 text-left text-xs text-[#ef4444] transition-colors hover:bg-[#ef4444]/10"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path
            d="M3 14V2M3 2H12L10 5L12 8H3"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Report
      </button>
    </div>
  );
}
