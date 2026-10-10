import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Row } from "@/components/notifications/NotificationList";
import {
  isActionable,
  notificationStyles,
  type AppNotification,
} from "@/data/notifications";

// TEMPORARY: the notification row before and after the tweaks, same samples.
// "Before" is a frozen, inert copy of the old markup. Delete src/app/dev when done.

const toneSolid: Record<string, string> = {
  brand: "border-brand bg-brand",
  success: "border-success bg-success",
  star: "border-star bg-star",
  danger: "border-danger bg-danger",
};

function OldRow({ n }: { n: AppNotification }) {
  const style = notificationStyles[n.kind];
  const actionable = isActionable(n);
  return (
    <li
      className={`relative flex items-start gap-3 overflow-hidden rounded-xl border p-4 pl-5 transition-colors ${
        n.read
          ? "border-border-default bg-bg-page hover:border-border-strong"
          : "border-brand/25 bg-brand/[0.04] hover:border-brand/50"
      }`}
    >
      {!n.read && <span className="absolute inset-y-0 left-0 w-1 bg-brand" />}
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="relative shrink-0">
          {n.actorAvatar ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- dev sample */}
              <img src={n.actorAvatar} alt="" className="size-10 rounded-full object-cover" />
              <span
                className={`absolute -bottom-0.5 -right-0.5 flex size-[18px] items-center justify-center rounded-full border border-bg-card-alt ${toneSolid[style.tone]}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- dev sample */}
                <img src={style.icon} alt="" className="h-2.5 w-auto brightness-0 invert" />
              </span>
            </>
          ) : (
            <div className={`flex size-10 items-center justify-center rounded-full border ${toneSolid[style.tone]}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- dev sample */}
              <img src={style.icon} alt="" className="h-4 w-auto brightness-0 invert" />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 text-sm font-bold text-white">{n.title}</span>
            <span className="shrink-0 text-[11px] text-text-muted">{n.createdAgo}</span>
          </div>
          {n.body && <span className="text-xs leading-relaxed text-text-muted">{n.body}</span>}
        </div>
      </div>
      {actionable ? (
        <div className="flex shrink-0 items-center gap-2">
          <span className="flex h-8 items-center gap-1.5 rounded-lg bg-brand px-2.5 text-[11px] font-bold text-white">
            {/* eslint-disable-next-line @next/next/no-img-element -- dev sample */}
            <img src="/icons/action-accept.svg" alt="" className="size-3" />
            <span className="hidden sm:inline">Accept</span>
          </span>
          <span className="flex h-8 items-center gap-1.5 rounded-lg bg-danger px-2.5 text-[11px] font-bold text-white">
            {/* eslint-disable-next-line @next/next/no-img-element -- dev sample */}
            <img src="/icons/action-decline.svg" alt="" className="size-3" />
            <span className="hidden sm:inline">Decline</span>
          </span>
        </div>
      ) : n.resolution ? (
        <span
          className={`mt-1 shrink-0 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
            n.resolution === "accepted" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
          }`}
        >
          {n.resolution}
        </span>
      ) : null}
    </li>
  );
}

const a1 = "/lfg/avatars/avatar-1.jpg";
const a2 = "/lfg/avatars/avatar-2.jpg";
const a3 = "/lfg/avatars/avatar-3.jpg";

const feed: AppNotification[] = [
  { id: "1", kind: "lobby_invite", title: "Yonziii invited you to Radiant grind", body: "Valorant · Competitive", actorName: "Yonziii", actorAvatar: a1, href: "/lfg/valorant/lobby/demo", createdAgo: "2m ago", read: false },
  { id: "2", kind: "join_request", title: "Tenz wants to join Radiant grind", body: 'Duelist · Immortal 2: "Hi! I main Jett and play every night."', actorName: "Tenz", actorAvatar: a2, href: "/lfg/valorant/lobby/demo", createdAgo: "14m ago", read: false },
  { id: "3", kind: "friend_request", title: "Tenz sent you a friend request", body: "", actorName: "Tenz", actorAvatar: a2, href: "/social/pending", createdAgo: "1h ago", read: false },
  { id: "4", kind: "application_declined", title: "Sova declined your application to Night owls", body: "", actorName: "Sova", actorAvatar: a3, href: "/lfg/mobile-legends/lobby/demo", createdAgo: "Yesterday", read: true },
  { id: "5", kind: "application_accepted", title: "You're in Night owls", body: "The leader accepted your application.", actorName: "Sova", actorAvatar: a3, href: "/lfg/league-of-legends/lobby/demo", createdAgo: "Yesterday", read: true },
  { id: "6", kind: "rating_due", title: "Rate your teammates from Radiant grind", body: "", href: "/lfg/valorant", createdAgo: "2d ago", read: false },
  { id: "7", kind: "review_received", title: "Yonziii rated you 5 stars", body: "Positive Mental Attitude · Shot Caller", actorName: "Yonziii", actorAvatar: a1, href: "/profile/me", createdAgo: "3d ago", read: true },
  { id: "8", kind: "join_request", title: "Tenz wants to join Radiant grind", body: "Duelist · Immortal 2", actorName: "Tenz", actorAvatar: a2, href: "/lfg/counter-strike-2/lobby/demo", resolution: "accepted", createdAgo: "6d ago", read: true },
  { id: "9", kind: "lobby_invite", title: "Yonziii invited you to Radiant grind no tilt no toxic only vibes and a very long name that wraps", body: "Free Fire · Ranked", actorName: "Yonziii", actorAvatar: a1, href: "/lfg/free-fire/lobby/demo", createdAgo: "6d ago", read: false },
  { id: "10", kind: "lobby_started", title: "Radiant grind has started", body: "", actorName: "Yonziii", actorAvatar: a1, href: "/lfg/pubg-mobile/lobby/demo", createdAgo: "7d ago", read: true },
];

export default function NotificationComparePage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-6 py-10">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-white">
              Notification row: before and after
            </h1>
            <p className="text-xs text-text-muted">
              Temporary page. &quot;Before&quot; is a frozen copy of the old
              row; &quot;After&quot; is the real row. Includes rows without a
              subtitle, unread rows with buttons, a resolved one and a long
              title. Buttons here do nothing. Delete{" "}
              <code>src/app/dev</code> when done.{" "}
              <Link href="/dev/notifications" className="underline">
                Every kind
              </Link>
            </p>
          </div>

          <div className="grid items-start gap-x-6 gap-y-10 xl:grid-cols-2">
            <section className="flex flex-col gap-3">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
                Before
              </h2>
              <ul className="flex flex-col gap-2">
                {feed.map((n) => (
                  <OldRow key={n.id} n={n} />
                ))}
              </ul>
            </section>
            <section className="flex flex-col gap-3">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-brand">
                After (what ships)
              </h2>
              <ul className="flex flex-col gap-2">
                {feed.map((n) => (
                  <Row key={n.id} notification={n} />
                ))}
              </ul>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
