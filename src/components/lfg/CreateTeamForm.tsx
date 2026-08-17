"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { lfgRoles, type LfgRole } from "@/data/lfg-roles";
import { lfgRanks } from "@/data/lfg-ranks";
import { regions, defaultRegion } from "@/data/regions";

const gamemodeOptions = ["Competitive", "Casual", "Deathmatch", "Spike Rush"];
const regionOptions = [...regions];
const languageOptions = ["English", "Indonesian", "English / Indonesian"];
const vibeTagOptions = ["Competitive", "Chill", "Tactical", "Grinding", "Voice Comms"];
const seekingRoleOrder: LfgRole[] = [
  lfgRoles.duelist,
  lfgRoles.controller,
  lfgRoles.sentinel,
  lfgRoles.initiator,
];

const MAX_GROUP_SIZE = 5;

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

export default function CreateTeamForm() {
  const router = useRouter();

  const [teamName, setTeamName] = useState("");
  const [gamemode, setGamemode] = useState(gamemodeOptions[0]);
  const [rankKey, setRankKey] = useState("immortal");
  const [description, setDescription] = useState("");
  const [vibeTags, setVibeTags] = useState<string[]>(["Competitive"]);

  const [region, setRegion] = useState<string>(defaultRegion);
  const [groupSize, setGroupSize] = useState(3);
  const [language, setLanguage] = useState(languageOptions[0]);
  const [playtimeMode, setPlaytimeMode] = useState<"now" | "schedule">("now");
  const [scheduleStart, setScheduleStart] = useState("08:00 PM");
  const [scheduleEnd, setScheduleEnd] = useState("11:00 PM");
  const [seekingRoles, setSeekingRoles] = useState<string[]>(["Duelist"]);
  const [anyRole, setAnyRole] = useState(false);
  const [micRequired, setMicRequired] = useState(true);

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

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    // TODO: wire up to the create-team API once it exists.
    router.push("/lfg/valorant");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Link
        href="/lfg/valorant"
        className="flex w-fit items-center gap-2 text-sm font-medium text-text-muted transition-colors hover:text-white"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
        <img src="/icons/lfg-back-arrow.svg" alt="" className="size-4" />
        Back to lobbies
      </Link>

      <div className="overflow-hidden rounded-2xl border border-border-strong bg-bg-card-alt">
        <div className="flex flex-col gap-2 px-6 pb-6 pt-8 sm:px-10 sm:pt-10">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Create a Team
          </h1>
          <p className="text-sm text-text-muted">
            Recruit the perfect squad for your next match.
          </p>
        </div>

        <div className="flex flex-col gap-8 px-6 pb-8 sm:px-10 lg:flex-row">
          <div className="flex flex-1 flex-col gap-6">
            <FormField label="Team Name">
              <input
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                placeholder="e.g. Radiant Pushers"
                className={inputClass}
              />
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Gamemode Selection">
                <SelectField
                  value={gamemode}
                  onChange={setGamemode}
                  options={gamemodeOptions}
                />
              </FormField>
              <FormField label="Rank Requirement">
                <div className="relative">
                  <select
                    value={rankKey}
                    onChange={(event) => setRankKey(event.target.value)}
                    className={`${inputClass} appearance-none pr-9`}
                  >
                    <option value="any">Any Rank</option>
                    {Object.entries(lfgRanks).map(([key, rank]) => (
                      <option key={key} value={key}>
                        {rank.name}
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
              </FormField>
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

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                    Group Size
                  </span>
                  <span className="text-xs font-bold text-white">
                    {groupSize}/{MAX_GROUP_SIZE} Spots
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border-strong bg-bg-page py-1.5 pl-4 pr-1.5">
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: MAX_GROUP_SIZE }).map((_, index) => (
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
                        setGroupSize((size) => Math.max(1, size - 1))
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
                        setGroupSize((size) =>
                          Math.min(MAX_GROUP_SIZE, size + 1)
                        )
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

              <FormField label="Language">
                <SelectField
                  value={language}
                  onChange={setLanguage}
                  options={languageOptions}
                />
              </FormField>

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
                <div className="flex gap-2">
                  {seekingRoleOrder.map((role) => {
                    const isSelected = seekingRoles.includes(role.name);
                    return (
                      <button
                        key={role.name}
                        type="button"
                        title={role.name}
                        aria-pressed={isSelected}
                        disabled={anyRole}
                        onClick={() => toggleSeekingRole(role.name)}
                        className={`flex size-10 items-center justify-center rounded-lg border transition-colors disabled:opacity-40 ${
                          isSelected && !anyRole
                            ? "border-white/20 bg-white/10"
                            : "border-border-strong bg-bg-page"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                        <img
                          src={role.icon}
                          alt={role.name}
                          className="size-4"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

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
          <div className="flex items-center gap-2 text-sm italic text-text-muted">
            <span className="size-1.5 rounded-full bg-[#10b981]" />
            Join 1,240+ active players online
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/lfg/valorant"
              className="text-sm font-bold text-text-muted transition-colors hover:text-white"
            >
              Discard
            </Link>
            <button
              type="submit"
              className="rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Create Team
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
