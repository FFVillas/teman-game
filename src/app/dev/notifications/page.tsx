import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Row } from "@/components/notifications/NotificationList";
import type { AppNotification, NotificationKind } from "@/data/notifications";

// TEMPORARY design gallery: every notification kind as the list draws it.
// Delete this folder when the redesign is done. Hidden in production.

const avatar = "/lfg/avatars/avatar-1.jpg";

type Sample = Omit<AppNotification, "id" | "kind" | "read" | "createdAgo"> & {
  createdAgo?: string;
  read?: boolean;
};

const samples: Record<NotificationKind, { label: string; items: Sample[] }> = {
  lobby_invite: {
    label: "Lobby invite (actionable)",
    items: [
      {
        title: "Yonziii invited you to Radiant grind",
        body: "Valorant · Competitive",
        actorName: "Yonziii",
        actorAvatar: avatar,
        href: "/lfg/valorant",
      },
      {
        title: "Yonziii invited you to Radiant grind",
        body: "Valorant · Competitive",
        actorName: "Yonziii",
        actorAvatar: avatar,
        resolution: "accepted",
        read: true,
      },
      {
        title: "Yonziii invited you to Radiant grind",
        body: "Valorant · Competitive",
        actorName: "Yonziii",
        actorAvatar: avatar,
        resolution: "declined",
        read: true,
      },
    ],
  },
  join_request: {
    label: "Join request (actionable)",
    items: [
      {
        title: "Tenz wants to join Radiant grind",
        body: 'Duelist · Immortal 2: "Hi! I main Jett and play every night."',
        actorName: "Tenz",
        actorAvatar: avatar,
      },
      {
        title: "Tenz wants to join Radiant grind",
        body: "Duelist · Immortal 2",
        actorName: "Tenz",
        actorAvatar: avatar,
        resolution: "accepted",
        read: true,
      },
    ],
  },
  application_accepted: {
    label: "Application accepted",
    items: [
      {
        title: "You're in Radiant grind",
        body: "The leader accepted your application.",
        actorName: "Yonziii",
        actorAvatar: avatar,
        href: "/lfg/valorant",
      },
    ],
  },
  application_declined: {
    label: "Application declined",
    items: [
      {
        title: "Yonziii declined your application to Radiant grind",
        body: "",
        actorName: "Yonziii",
        actorAvatar: avatar,
        href: "/lfg/valorant",
      },
    ],
  },
  lobby_started: {
    label: "Lobby started",
    items: [
      {
        title: "Radiant grind has started",
        body: "Head over and join your teammates.",
        actorName: "Yonziii",
        actorAvatar: avatar,
        href: "/lfg/valorant",
      },
    ],
  },
  rating_due: {
    label: "Rating due",
    items: [
      {
        title: "Rate your teammates from Radiant grind",
        body: "Four players are waiting for your review.",
        href: "/lfg/valorant",
      },
    ],
  },
  friend_request: {
    label: "Friend request (links to /social/pending)",
    items: [
      {
        title: "Tenz sent you a friend request",
        body: "",
        actorName: "Tenz",
        actorAvatar: avatar,
        href: "/social/pending",
      },
    ],
  },
  removed_from_lobby: {
    label: "Removed from a lobby",
    items: [
      {
        title: "You were removed from Radiant grind",
        body: "The leader removed you from the lobby.",
        actorName: "Yonziii",
        actorAvatar: avatar,
        href: "/lfg/valorant",
      },
    ],
  },
  review_received: {
    label: "Review received",
    items: [
      {
        title: "Yonziii rated you 5 stars",
        body: "Positive Mental Attitude · Shot Caller",
        actorName: "Yonziii",
        actorAvatar: avatar,
        href: "/profile/me",
      },
    ],
  },
};

/** The same notification with and without a person behind it, and read vs unread. */
const variants: { label: string; items: Sample[] }[] = [
  {
    label: "Variants: avatar vs icon, unread vs read, long text",
    items: [
      { title: "With an avatar, unread", body: "Body text under the title.", actorName: "Tenz", actorAvatar: avatar },
      { title: "With an avatar, read", body: "Body text under the title.", actorName: "Tenz", actorAvatar: avatar, read: true },
      { title: "No person behind it, unread", body: "Falls back to the kind icon in a round tile." },
      { title: "No person behind it, read", body: "Falls back to the kind icon in a round tile.", read: true },
      {
        title: "A very long title that keeps going to see how the row wraps when a lobby name is silly long: Radiant grind no tilt no toxic only vibes",
        body: "A long body line that also keeps going so you can check the wrapping and how the time on the right behaves next to a title that spans several lines on a narrow screen.",
        actorName: "Tenz",
        actorAvatar: avatar,
      },
    ],
  },
];

function toNotification(kind: NotificationKind, sample: Sample, index: number): AppNotification {
  return {
    id: `sample-${kind}-${index}`,
    kind,
    title: sample.title,
    body: sample.body,
    actorName: sample.actorName,
    actorAvatar: sample.actorAvatar,
    href: sample.href,
    resolution: sample.resolution,
    createdAgo: sample.createdAgo ?? ["2m ago", "1h ago", "3d ago"][index % 3],
    read: sample.read ?? false,
  };
}

export default function NotificationGalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const groups = [
    ...(Object.keys(samples) as NotificationKind[]).map((kind) => ({
      key: kind,
      label: samples[kind].label,
      kind,
      items: samples[kind].items,
    })),
    ...variants.map((group) => ({
      key: group.label,
      label: group.label,
      kind: "review_received" as NotificationKind,
      items: group.items,
    })),
  ];

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-8 px-6 py-10">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-extrabold tracking-tight text-white">
              Notification designs
            </h1>
            <p className="text-xs text-text-muted">
              Temporary page. Every kind as the list draws it, with sample
              text. Accept and Decline here do nothing real. Delete{" "}
              <code>src/app/dev</code> when done.
            </p>
          </div>

          {groups.map((group) => (
            <section key={group.key} className="flex flex-col gap-3">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
                {group.label}
              </h2>
              <ul className="flex flex-col gap-2">
                {group.items.map((sample, index) => (
                  <Row
                    key={index}
                    notification={toNotification(group.kind, sample, index)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
