import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ToastGallery from "./ToastGallery";

// TEMPORARY: the bottom-right pop-ups (toasts) and everything that fires one.
// Delete src/app/dev when the redesign is done. Hidden in production.

type Tone = "success" | "info" | "danger";

/** Every place a pop-up is raised today, grouped by area. */
const catalog: {
  area: string;
  rows: { when: string; tone: Tone; text: string; where: string }[];
}[] = [
  {
    area: 'Still pops up: things you just did',
    rows: [
      { when: 'Leader starts the lobby', tone: 'success', text: 'Lobby is live · It no longer accepts new players.', where: 'RealLobbyDetail' },
      { when: 'Leader ends or closes it', tone: 'info', text: 'Lobby ended / Lobby closed · …', where: 'RealLobbyDetail' },
      { when: 'You save an edited lobby', tone: 'success', text: 'Lobby updated · Your changes have been saved.', where: 'CreateTeamForm' },
      { when: 'A chat or direct message fails', tone: 'danger', text: 'Message not sent · {reason}', where: 'RealLobbyChat, MessagesView' },
      { when: 'Answering from the bell or a pop-up fails', tone: 'danger', text: "Couldn't answer this invitation / request · {reason}", where: 'NotificationList, ToastHost' },
      { when: 'Friend request, block, unblock, accept or decline fails', tone: 'danger', text: "Couldn't … · Try again in a moment.", where: 'PlayerRowActions, SocialBlockedPanel, PendingRequestRow' },
      { when: 'You finish onboarding', tone: 'success', text: "You're all set · Your profile has been saved…", where: 'OnboardingFlow' },
      { when: 'You save your profile', tone: 'success', text: 'Profile updated · Your changes have been saved.', where: 'EditProfileForm' },
      { when: 'You change your password / email', tone: 'success', text: 'Password updated · … / Check your inbox · …', where: 'SettingsView' },
      { when: 'You report a player', tone: 'success', text: 'Report sent · A moderator will review your report on {name}.', where: 'ReportPlayerPanel' },
      { when: 'Admin claims a case / dismisses a report', tone: 'info', text: 'Case claimed / Report dismissed · …', where: 'ReportCase' },
    ],
  },
  {
    area: 'New: things that happen to you (realtime, built by incomingToast)',
    rows: [
      { when: 'Someone invites you to a lobby', tone: 'info', text: '{name} invited you to {lobby} · Accept / Decline', where: 'notifications insert' },
      { when: 'Someone asks to join your lobby', tone: 'info', text: '{name} wants to join {lobby} · Accept / Decline', where: 'notifications insert' },
      { when: 'Someone sends you a friend request', tone: 'info', text: '{name} sent you a friend request · Accept / Decline', where: 'notifications insert' },
      { when: 'You are accepted into a lobby', tone: 'success', text: "You're in {lobby} · The leader accepted your application.", where: 'notifications insert' },
      { when: 'You are declined', tone: 'info', text: '{name} declined your application to {lobby}', where: 'notifications insert' },
      { when: 'A lobby you are in starts', tone: 'success', text: '{lobby} has started · Head over and join your teammates.', where: 'notifications insert' },
      { when: 'The leader removes you', tone: 'danger', text: 'You were removed from {lobby} · The leader removed you from the lobby.', where: 'notifications insert (new kind)' },
    ],
  },
  {
    area: 'Removed: no pop-up any more (the screen already shows it)',
    rows: [
      { when: 'Leader accepts / declines an applicant, reopens recruiting, removes a member', tone: 'success', text: '(none)', where: 'RealLobbyDetail' },
      { when: 'You leave a lobby or withdraw, create a lobby, apply to one', tone: 'success', text: '(none)', where: 'RealLobbyDetail, CreateTeamForm, RequestToJoinModal' },
      { when: 'You accept or decline an invite or request', tone: 'success', text: '(none)', where: 'NotificationList, RealLobbyDetail, ToastHost' },
      { when: 'You send a friend request, or block a player', tone: 'success', text: '(none)', where: 'PlayerRowActions' },
      { when: 'Admin: sanction issued / lifted, lobby closed, member removed', tone: 'success', text: '(none)', where: 'SanctionModal, PlayerRecord, LobbyRecord' },
    ],
  },
  {
    area: 'Mock lobby screen (src/data lobbies only, unchanged)',
    rows: [
      { when: 'Start, leave, accept or decline an invite', tone: 'success', text: 'Lobby is live / You left the lobby / Invitation accepted / declined', where: 'LobbyDetail' },
    ],
  },
];

const toneClass: Record<Tone, string> = {
  success: "bg-success/10 text-success",
  info: "bg-brand/10 text-brand",
  danger: "bg-danger/10 text-danger",
};

export default function ToastsPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-10 px-6 py-10">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-white">
              Pop-up notifications (toasts)
            </h1>
            <p className="text-xs text-text-muted">
              Temporary page. The card below is the real component. Delete{" "}
              <code>src/app/dev</code> when done.
            </p>
          </div>

          <ToastGallery />

          <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
                What makes a pop-up show
              </h2>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-xs leading-relaxed text-text-subtle">
                <li>
                  <code>toast()</code> (from <code>useNotifications()</code>)
                  raises one for something you just did. It shows for 4.5s,
                  stacks, and closes on the × or when you click its link.
                </li>
                <li>
                  <strong>A new notification row</strong> (insert on{" "}
                  <code>notifications</code>, delivered by realtime) also
                  raises one, built by <code>incomingToast()</code>. Invites,
                  join requests and friend requests carry Accept / Decline and
                  stay 12s. A new direct message or lobby chat line does{" "}
                  <em>not</em> pop up: DMs only raise the badge on the
                  messages icon.
                </li>
                <li>
                  <code>notify()</code> files a row, so for a signed-in player
                  its pop-up now comes from that same realtime path. Only the
                  mock lobby screen calls it.
                </li>
                <li>
                  Tones: <span className="text-success">success</span>,{" "}
                  <span className="text-brand">info</span>,{" "}
                  <span className="text-danger">danger</span>. The host is{" "}
                  <code>ToastHost</code>, mounted once in the root layout.
                </li>
              </ul>
            </div>

            {catalog.map((group) => (
              <div key={group.area} className="flex flex-col gap-2">
                <h3 className="text-xs font-bold text-white">{group.area}</h3>
                <ul className="divide-y divide-border-default overflow-hidden rounded-xl border border-border-default">
                  {group.rows.map((row) => (
                    <li key={row.text} className="flex flex-wrap items-start gap-x-4 gap-y-1 bg-bg-page px-4 py-2.5 text-xs">
                      <span className={`mt-0.5 w-16 shrink-0 rounded px-1.5 py-0.5 text-center text-[10px] font-bold uppercase ${toneClass[row.tone]}`}>
                        {row.tone}
                      </span>
                      <span className="min-w-[200px] flex-1 text-text-subtle">
                        <span className="font-medium text-white">{row.when}</span>
                        <br />
                        {row.text}
                      </span>
                      <span className="text-[11px] text-text-muted">{row.where}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
