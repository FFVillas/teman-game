"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { roleIconFor } from "@/data/role-icons";
import { useNotifications } from "@/contexts/NotificationContext";
import { regionsFor } from "@/data/game-regions";
import { randomCoverKey } from "@/data/lfg-covers";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { createLobby, updateLobby } from "@/lib/lobbies";
import type { GameInfo } from "@/lib/games";
import {
  OPEN_BOUNDS,
  boundsFromTierRange,
  describeBounds,
  lobbyJoinBounds,
  ordinalFits,
  partyRuleFor,
  rankRangeEnds,
  tiersOf,
  type TierRange,
} from "@/lib/ranks";
import BackLink from "@/components/BackLink";
import RankRangeFields from "./RankRangeFields";

const languageOptions = ["English", "Indonesian", "English / Indonesian"];
const vibeTagOptions = ["Competitive", "Chill", "Tactical", "Grinding", "Voice Comms"];

/**
 * A clock time like "08:00 PM" as the next moment it happens, in UTC+7 (the
 * form says times are local UTC+7), strictly after `notBefore`. The form
 * collects a time of day only, so "8 PM" means tonight, or tomorrow if that
 * has already passed.
 */
function nextJakartaTime(label: string, notBefore: Date): Date {
  const [clock, period] = label.split(" ");
  const [hourText, minuteText] = clock.split(":");
  let hour = Number(hourText) % 12;
  if (period === "PM") hour += 12;
  const minute = Number(minuteText);
  const jakartaNow = new Date(Date.now() + 7 * 3_600_000);
  let moment = Date.UTC(
    jakartaNow.getUTCFullYear(),
    jakartaNow.getUTCMonth(),
    jakartaNow.getUTCDate(),
    hour - 7,
    minute
  );
  while (moment <= notBefore.getTime()) moment += 86_400_000;
  return new Date(moment);
}

const timeOptions = (() => {
  const times: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (const minute of [0, 30]) {
      const period = hour < 12 ? "AM" : "PM";
      const displayHour = hour % 12 === 0 ? 12 : hour % 12;
      times.push(
        `${String(displayHour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`
      );
    }
  }
  return times;
})();

const inputClass =
  "w-full rounded-lg border border-border-strong bg-bg-page px-4 py-3 text-sm text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand";

/** Greys out and disables a part of the form (a fieldset disables every control inside). */
function Lockable({ locked, children }: { locked: boolean; children: ReactNode }) {
  return (
    <fieldset
      disabled={locked}
      className={`m-0 min-w-0 border-0 p-0 ${locked ? "opacity-50" : ""}`}
    >
      {children}
    </fieldset>
  );
}

/** A stored timestamp as the form's clock label, e.g. "08:00 PM", in UTC+7. */
function clockLabel(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).formatToParts(new Date(iso));
  const hour = parts.find((part) => part.type === "hour")?.value ?? "8";
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const period = (parts.find((part) => part.type === "dayPeriod")?.value ?? "PM").toUpperCase();
  return `${hour.padStart(2, "0")}:${minute >= 15 && minute < 45 ? "30" : "00"} ${period}`;
}

/** What the form starts from when it edits an existing lobby. */
export interface EditLobbyInit {
  lobbyId: string;
  status: "live" | "scheduled" | "started";
  name: string;
  description: string;
  modeId: number;
  /** A region code ("AP"). */
  region: string;
  languages: string[];
  mic: boolean;
  tags: string[];
  capacity: number;
  rankRange?: TierRange;
  roleNames: string[];
  discordUrl: string;
  startsAt: string | null;
  endsAt: string | null;
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
        {label}
      </span>
      {children}
    </div>
  );
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} appearance-none pr-9`}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
      <img
        src="/icons/lfg-select-chevron.svg"
        alt=""
        className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 opacity-50"
      />
    </div>
  );
}

export default function CreateTeamForm({
  gameSlug,
  gameName,
  game,
  leaderRank,
  edit,
}: {
  /** `games.slug`; picks the game's modes, regions and where Save returns to. */
  gameSlug: string;
  gameName: string;
  /** The game's ranks and roles from the database. Missing if it couldn't load. */
  game?: GameInfo;
  /** The signed-in leader's own rank in this game, e.g. "Gold 2"; "" if unknown. */
  leaderRank?: string;
  /** Set to edit an existing lobby instead of creating one. */
  edit?: EditLobbyInit;
}) {
  const router = useRouter();
  const { toast } = useNotifications();
  const { user } = useAuth();
  const lobbiesHref = `/lfg/${gameSlug}`;
  // Editing: the mode never changes, and once the lobby is playing the group
  // size, rank range, roles and schedule are locked too.
  const lockMode = Boolean(edit);
  const lockRest = edit?.status === "started";
  const leaveHref = edit ? `${lobbiesHref}/lobby/${edit.lobbyId}` : lobbiesHref;
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const modes = game?.modes ?? [];
  const modeLabels = modes.map((mode) => mode.label);
  const roles = game?.roles ?? [];
  // SelectField takes plain strings, so region labels are used as the values
  // here. The form doesn't submit anywhere yet, which is fine until lobbies
  // are real; then the stored value is the region's `value` (e.g. "AP").
  const regionList = regionsFor(gameSlug);
  const regionOptions = regionList.options.map((option) => option.label);
  const defaultRegionLabel =
    regionList.options.find((option) => option.value === regionList.default)
      ?.label ?? regionOptions[0];

  const [teamName, setTeamName] = useState(edit?.name ?? "");
  const [modeLabel, setModeLabel] = useState(
    modes.find((mode) => mode.id === edit?.modeId)?.label ?? modeLabels[0] ?? ""
  );
  // The ranks this lobby accepts. Off by default: a full group often doesn't
  // care about rank, and it's the leader's call whether to set a limit.
  const [anyRank, setAnyRank] = useState(
    edit ? !(edit.rankRange?.from || edit.rankRange?.to) : true
  );
  const [rankRange, setRankRange] = useState<TierRange>(
    edit?.rankRange ?? { from: "", to: "" }
  );
  const [description, setDescription] = useState(edit?.description ?? "");
  const [vibeTags, setVibeTags] = useState<string[]>(edit?.tags ?? ["Competitive"]);
  const [discordUrl, setDiscordUrl] = useState(edit?.discordUrl ?? "");

  const [region, setRegion] = useState<string>(
    regionList.options.find((option) => option.value === edit?.region)?.label ??
      defaultRegionLabel
  );
  // The mode decides how big a group can be (Wingman is 2, a squad is 4…).
  const maxGroupSize =
    modes.find((mode) => mode.label === modeLabel)?.maxParty ?? 5;
  const [requestedGroupSize, setGroupSize] = useState(edit?.capacity ?? 3);
  const groupSize = Math.min(requestedGroupSize, maxGroupSize);

  // Who could join, from two sources: the game's own rule about how far apart
  // ranks in a party may be (applied to the people already in: just the
  // leader for now), and the range the leader chose, if any. See lib/ranks.ts.
  const tiers = useMemo(() => tiersOf(game?.ranks ?? []), [game]);
  const activeMode = modes.find((mode) => mode.label === modeLabel);
  const leaderOrdinal =
    game?.ranks.find((rank) => rank.name === leaderRank)?.ordinal ?? null;
  const gameRule = partyRuleFor(activeMode, groupSize, game?.ranks ?? []);
  const chosenBounds = anyRank
    ? OPEN_BOUNDS
    : boundsFromTierRange(tiers, rankRange);
  const joinBounds = lobbyJoinBounds(
    gameRule,
    tiers,
    leaderOrdinal === null ? [] : [leaderOrdinal],
    chosenBounds
  );
  const leaderOutsideRange =
    leaderOrdinal !== null && !ordinalFits(leaderOrdinal, chosenBounds);
  const [language, setLanguage] = useState(
    languageOptions.find((option) => edit && option === edit.languages.join(" / ")) ??
      languageOptions[0]
  );
  const [playtimeMode, setPlaytimeMode] = useState<"now" | "schedule">(
    edit?.startsAt ? "schedule" : "now"
  );
  const [scheduleStart, setScheduleStart] = useState(
    edit?.startsAt ? clockLabel(edit.startsAt) : "08:00 PM"
  );
  const [scheduleEnd, setScheduleEnd] = useState(
    edit?.endsAt ? clockLabel(edit.endsAt) : "11:00 PM"
  );
  const [seekingRoles, setSeekingRoles] = useState<string[]>(edit?.roleNames ?? []);
  const [anyRole, setAnyRole] = useState(edit ? edit.roleNames.length === 0 : false);
  const [micRequired, setMicRequired] = useState(edit?.mic ?? true);

  function toggleVibeTag(tag: string) {
    setVibeTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function toggleSeekingRole(role: string) {
    setSeekingRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (!user) {
      setSubmitError("Log in to create a lobby.");
      return;
    }
    if (!game || !activeMode) {
      setSubmitError("Pick a game mode first.");
      return;
    }

    // The form holds labels; the database stores codes and ids.
    const regionCode =
      regionList.options.find((option) => option.label === region)?.value ??
      regionList.default;
    const ends = anyRank ? {} : rankRangeEnds(game.ranks, rankRange);
    const now = new Date();
    const startsAt =
      playtimeMode === "schedule" ? nextJakartaTime(scheduleStart, now) : null;
    const endsAt =
      startsAt && scheduleEnd ? nextJakartaTime(scheduleEnd, startsAt) : null;

    setSubmitting(true);
    setSubmitError(null);

    if (edit) {
      // Leaving a schedule untouched keeps its stored moments, so saving a
      // lobby whose start has just passed doesn't push it to tomorrow.
      const keepStart =
        edit.startsAt && playtimeMode === "schedule" && scheduleStart === clockLabel(edit.startsAt);
      const keepEnd =
        edit.endsAt && keepStart && scheduleEnd === clockLabel(edit.endsAt);
      const failure = await updateLobby(createClient(), {
        lobbyId: edit.lobbyId,
        name: teamName.trim(),
        description,
        region: regionCode,
        languages: language.split(" / "),
        micRequired,
        tags: vibeTags,
        capacity: groupSize,
        startsAt: keepStart ? edit.startsAt : (startsAt?.toISOString() ?? null),
        endsAt: keepEnd ? edit.endsAt : (endsAt?.toISOString() ?? null),
        minRankId: ends.from?.id ?? null,
        maxRankId: ends.to?.id ?? null,
        roleIds: anyRole
          ? []
          : game.roles
              .filter((role) => seekingRoles.includes(role.name))
              .map((role) => role.id),
        discordUrl,
      });
      setSubmitting(false);
      if (failure) {
        setSubmitError(failure);
        return;
      }
      toast({ tone: "success", title: "Lobby updated" });
      router.push(leaveHref);
      router.refresh();
      return;
    }

    const result = await createLobby(createClient(), {
      game,
      modeId: activeMode.id,
      name: teamName.trim(),
      description,
      region: regionCode,
      languages: language.split(" / "),
      micRequired,
      tags: vibeTags,
      capacity: groupSize,
      startsAt: startsAt?.toISOString() ?? null,
      endsAt: endsAt?.toISOString() ?? null,
      minRankId: ends.from?.id ?? null,
      maxRankId: ends.to?.id ?? null,
      cover: randomCoverKey(gameSlug),
      roleIds: anyRole
        ? []
        : game.roles
            .filter((role) => seekingRoles.includes(role.name))
            .map((role) => role.id),
      discordUrl,
    });
    setSubmitting(false);

    if ("error" in result) {
      setSubmitError(result.error);
      return;
    }
    toast({
      tone: "success",
      title: "Lobby created",
      body: `${teamName.trim()} is now open for applications.`,
    });
    router.push(lobbiesHref);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <BackLink
        label={edit ? "Back to lobby" : "Back to lobbies"}
        href={leaveHref}
      />

      <div className="overflow-hidden rounded-2xl border border-border-strong bg-bg-card-alt">
        <div className="flex flex-col gap-2 px-6 pb-6 pt-8 sm:px-10 sm:pt-10">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            {edit ? "Edit your lobby" : "Create a Team"}
          </h1>
          <p className="text-sm text-text-muted">
            {edit
              ? lockRest
                ? "This lobby is playing, so its group size, rank range, roles and playtime are locked. The rest can still change."
                : "The game mode can't change once a lobby exists. Everything else can."
              : `Recruit the perfect squad for your next ${gameName} match.`}
          </p>
        </div>

        <div className="flex flex-col gap-8 px-6 pb-8 sm:px-10 lg:flex-row">
          <div className="flex flex-1 flex-col gap-6">
            <FormField label="Team Name">
              <input
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                placeholder="e.g. Midnight Squad"
                className={inputClass}
              />
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Lockable locked={lockMode}>
                <FormField label="Gamemode Selection">
                  <SelectField
                    value={modeLabel}
                    onChange={setModeLabel}
                    options={modeLabels}
                  />
                </FormField>
              </Lockable>
              {tiers.length > 0 && (
                <Lockable locked={lockRest}>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                      Rank Requirement
                    </span>
                    <label className="flex items-center gap-1.5 text-xs text-text-muted">
                      <input
                        type="checkbox"
                        checked={anyRank}
                        onChange={(event) => setAnyRank(event.target.checked)}
                        className="size-4 rounded accent-brand"
                      />
                      Any rank
                    </label>
                  </div>

                  {anyRank ? (
                    <p className="rounded-lg border border-dashed border-border-strong px-4 py-3 text-sm text-text-muted">
                      Anyone can ask to join.
                    </p>
                  ) : (
                    <RankRangeFields
                      size="md"
                      labelPrefix="Accepted rank"
                      tiers={tiers}
                      value={rankRange}
                      onChange={setRankRange}
                    />
                  )}

                  {leaderOrdinal !== null && (
                    <p className="text-xs leading-relaxed text-text-muted">
                      Players who can join:{" "}
                      <span className="font-semibold text-white">
                        {describeBounds(tiers, joinBounds)}
                      </span>
                      {gameRule.kind !== "none" && (
                        <>
                          {" "}
                          · {gameName} limits how far apart ranks in a group
                          can be in this mode.
                        </>
                      )}
                    </p>
                  )}
                  {leaderOutsideRange && (
                    <p className="text-xs text-danger">
                      Your own rank ({leaderRank}) is outside this range.
                    </p>
                  )}
                </div>
                </Lockable>
              )}
            </div>

            <FormField label="Objective / Description">
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe your team goals, playstyle, and what you're looking for..."
                rows={5}
                className={`${inputClass} h-[140px] resize-none`}
              />
            </FormField>

            <FormField label="Discord voice link (optional)">
              <input
                type="url"
                value={discordUrl}
                onChange={(event) => setDiscordUrl(event.target.value)}
                placeholder="https://discord.gg/yourcode"
                className={inputClass}
              />
              <span className="text-[11px] text-text-muted">
                Only you and the players you accept can see this link.
              </span>
            </FormField>

            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Vibe Tags
              </span>
              <div className="flex flex-wrap gap-2">
                {vibeTagOptions.map((tag) => {
                  const isSelected = vibeTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleVibeTag(tag)}
                      aria-pressed={isSelected}
                      className={`rounded-full border px-4 py-1.5 text-xs transition-colors ${
                        isSelected
                          ? "border-brand text-brand"
                          : "border-border-strong text-text-muted hover:border-white/30"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="w-full shrink-0 lg:w-[320px]">
            <div className="flex flex-col gap-6 rounded-[24px] border border-border-strong bg-bg-card-alt p-6">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                <img
                  src="/icons/lfg-settings-sliders.svg"
                  alt=""
                  className="size-[18px] opacity-70"
                />
                <h2 className="text-base font-bold text-white">
                  Lobby Settings
                </h2>
              </div>

              <FormField label="Region">
                <SelectField
                  value={region}
                  onChange={setRegion}
                  options={regionOptions}
                />
              </FormField>

              <Lockable locked={lockRest}>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                    Group Size
                  </span>
                  <span className="text-xs font-bold text-white">
                    {groupSize}/{maxGroupSize} Spots
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border-strong bg-bg-page py-1.5 pl-4 pr-1.5">
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: maxGroupSize }).map((_, index) => (
                      <span
                        key={index}
                        className={`size-2 rounded-full ${
                          index < groupSize ? "bg-brand" : "bg-white/15"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Decrease group size"
                      onClick={() =>
                        setGroupSize(Math.max(1, groupSize - 1))
                      }
                      className="flex size-7 items-center justify-center rounded border border-border-strong bg-white/[0.06] transition-colors hover:bg-white/10"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                      <img
                        src="/icons/lfg-minus.svg"
                        alt=""
                        className="size-3.5"
                      />
                    </button>
                    <button
                      type="button"
                      aria-label="Increase group size"
                      onClick={() =>
                        setGroupSize(Math.min(maxGroupSize, groupSize + 1))
                      }
                      className="flex size-7 items-center justify-center rounded border border-border-strong bg-white/[0.06] transition-colors hover:bg-white/10"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                      <img
                        src="/icons/lfg-plus.svg"
                        alt=""
                        className="size-3.5"
                      />
                    </button>
                  </div>
                </div>
              </div>
              </Lockable>

              <FormField label="Language">
                <SelectField
                  value={language}
                  onChange={setLanguage}
                  options={languageOptions}
                />
              </FormField>

              <Lockable locked={lockRest}>
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Playtime
                </span>
                <div className="flex gap-1 rounded-lg border border-border-strong bg-bg-page p-1">
                  <button
                    type="button"
                    onClick={() => setPlaytimeMode("now")}
                    aria-pressed={playtimeMode === "now"}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                      playtimeMode === "now"
                        ? "bg-white/10 text-white"
                        : "text-text-muted"
                    }`}
                  >
                    {playtimeMode === "now" && (
                      <span className="size-1.5 rounded-full bg-[#10b981]" />
                    )}
                    Looking Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlaytimeMode("schedule")}
                    aria-pressed={playtimeMode === "schedule"}
                    className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                      playtimeMode === "schedule"
                        ? "bg-white/10 text-white"
                        : "text-text-muted"
                    }`}
                  >
                    Schedule
                  </button>
                </div>

                {playtimeMode === "schedule" && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <select
                          value={scheduleStart}
                          onChange={(event) =>
                            setScheduleStart(event.target.value)
                          }
                          className="w-full appearance-none rounded-lg border border-border-default bg-bg-page py-2 pl-3 pr-8 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand"
                        >
                          {timeOptions.map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                        <img
                          src="/icons/lfg-select-chevron.svg"
                          alt=""
                          className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2"
                        />
                      </div>
                      <span className="text-xs text-white">to</span>
                      <div className="relative flex-1">
                        <select
                          value={scheduleEnd}
                          onChange={(event) =>
                            setScheduleEnd(event.target.value)
                          }
                          className="w-full appearance-none rounded-lg border border-border-default bg-bg-page py-2 pl-3 pr-8 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand"
                        >
                          {timeOptions.map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                        <img
                          src="/icons/lfg-select-chevron.svg"
                          alt=""
                          className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-1">
                      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                      <img
                        src="/icons/lfg-utc-globe.svg"
                        alt=""
                        className="size-2.5"
                      />
                      <span className="text-[11px] text-text-muted">
                        Times are in your local time (UTC+7)
                      </span>
                    </div>
                  </>
                )}
              </div>
              </Lockable>

              {roles.length > 0 && (
                <Lockable locked={lockRest}>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                      Seeking Roles
                    </span>
                    <label className="flex items-center gap-1.5 text-xs text-text-muted">
                      <input
                        type="checkbox"
                        checked={anyRole}
                        onChange={(event) => setAnyRole(event.target.checked)}
                        className="size-4 rounded accent-brand"
                      />
                      Any Role
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {roles.map((role) => {
                      const isSelected = seekingRoles.includes(role.name);
                      const icon = roleIconFor(gameSlug, role.name);
                      return (
                        <button
                          key={role.id}
                          type="button"
                          title={role.name}
                          aria-pressed={isSelected}
                          disabled={anyRole}
                          onClick={() => toggleSeekingRole(role.name)}
                          className={`flex items-center justify-center rounded-lg border transition-colors disabled:opacity-40 ${
                            icon ? "size-10" : "px-3 py-2 text-xs font-semibold"
                          } ${
                            isSelected && !anyRole
                              ? "border-white/20 bg-white/10 text-white"
                              : "border-border-strong bg-bg-page text-text-muted"
                          }`}
                        >
                          {icon ? (
                            // eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization
                            <img src={icon} alt={role.name} className="size-4" />
                          ) : (
                            role.name
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                </Lockable>
              )}

              <div className="flex items-center justify-between border-t border-border-strong pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                    <img
                      src="/icons/lfg-mic-outline.svg"
                      alt=""
                      className="size-4"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">
                      Mic Required
                    </span>
                    <span className="text-xs text-text-muted">
                      Voice comms needed
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={micRequired}
                  aria-label="Toggle mic required"
                  onClick={() => setMicRequired((value) => !value)}
                  className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${
                    micRequired
                      ? "justify-end bg-[#10b981]"
                      : "justify-start bg-white/15"
                  }`}
                >
                  <span className="size-4 rounded-full bg-white shadow" />
                </button>
              </div>
            </div>
          </aside>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-border-strong px-6 py-5 sm:px-10">
          <p
            role={submitError ? "alert" : undefined}
            className={`text-sm ${submitError ? "text-danger" : "text-text-muted"}`}
          >
            {submitError ?? ""}
          </p>
          <div className="flex items-center gap-6">
            <Link
              href={leaveHref}
              className="text-sm font-bold text-text-muted transition-colors hover:text-white"
            >
              Discard
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (edit ? "Saving…" : "Creating…") : edit ? "Save changes" : "Create Team"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
