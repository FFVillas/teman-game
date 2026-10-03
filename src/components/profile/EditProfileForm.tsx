"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  personalityTagOptions,
  type PlayerProfile,
} from "@/data/player-profiles";
import { useNotifications } from "@/contexts/NotificationContext";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { validateUsername } from "@/lib/username";
import {
  daysInMonth,
  joinDate,
  splitDate,
  validateDateOfBirth,
  MINIMUM_AGE,
  type DateParts,
} from "@/lib/age";
import { formatTime, timeOptions, trimSeconds } from "@/lib/availability";
import type { ProfileRow } from "@/lib/profiles";
import {
  DEFAULT_TIMEZONE,
  languageOptions,
  MAX_LANGUAGES,
  MAX_PERSONALITY_TAGS,
  monthNames,
  playDayOptions,
  timezoneOptions,
} from "@/data/profile-options";
import BackLink from "@/components/BackLink";
import FormDropdown from "@/components/FormDropdown";

const MAX_TAGS = MAX_PERSONALITY_TAGS;
const playstyleScale = [1, 2, 3, 4, 5];

const genderOptions = ["Male", "Female", "Prefer not to say"];

const controlClass =
  "w-full rounded-lg border border-border-strong bg-bg-page px-3 py-2.5 text-xs text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand";
const labelClass =
  "text-[11px] font-bold uppercase tracking-widest text-text-muted";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      {children}
    </div>
  );
}

/** Half-hour steps. A saved time that isn't on the grid is kept as an option. */
function TimeSelect({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const isOffGrid = value !== "" && !timeOptions.some((o) => o.value === value);
  const options = isOffGrid
    ? [{ value, label: formatTime(value) }, ...timeOptions]
    : timeOptions;

  return (
    <FormDropdown
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      placeholder="Not set"
    />
  );
}

/**
 * Day / month / year dropdowns. Years start at the youngest allowed age, so
 * the list can't be scrolled into "too young" — and nobody has to click back
 * through decades in a calendar popup to reach their birth year. Day options
 * follow the chosen month, so "31 February" can't be picked.
 */
function DateOfBirthField({
  parts,
  onChange,
  invalid,
}: {
  parts: DateParts;
  onChange: (parts: DateParts) => void;
  invalid?: boolean;
}) {
  const thisYear = new Date().getFullYear();
  const years = Array.from(
    { length: 100 - MINIMUM_AGE },
    (_, index) => thisYear - MINIMUM_AGE - index
  );

  const maxDay =
    parts.month && parts.year
      ? daysInMonth(Number(parts.year), Number(parts.month))
      : parts.month
        ? daysInMonth(2000, Number(parts.month)) // leap year until a year is chosen
        : 31;

  function update(patch: Partial<DateParts>) {
    const next = { ...parts, ...patch };
    // Changing month/year can shrink the month (31 → 30, 29 → 28): clamp.
    if (next.month) {
      const limit = next.year
        ? daysInMonth(Number(next.year), Number(next.month))
        : daysInMonth(2000, Number(next.month));
      if (next.day && Number(next.day) > limit) next.day = String(limit);
    }
    onChange(next);
  }

  const dayOptions = Array.from({ length: maxDay }, (_, index) => ({
    value: String(index + 1),
    label: String(index + 1),
  }));
  const monthOptions = monthNames.map((name, index) => ({
    value: String(index + 1),
    label: name,
  }));
  const yearOptions = years.map((year) => ({
    value: String(year),
    label: String(year),
  }));

  return (
    <div className="grid grid-cols-[1fr_1.6fr_1.1fr] gap-2">
      <FormDropdown
        label="Day"
        placeholder="Day"
        value={parts.day}
        onChange={(day) => update({ day })}
        options={dayOptions}
        invalid={invalid}
      />
      <FormDropdown
        label="Month"
        placeholder="Month"
        value={parts.month}
        onChange={(month) => update({ month })}
        options={monthOptions}
        invalid={invalid}
      />
      <FormDropdown
        label="Year"
        placeholder="Year"
        value={parts.year}
        onChange={(year) => update({ year })}
        options={yearOptions}
        invalid={invalid}
      />
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border-strong bg-bg-card-alt p-5">
      <h2 className={labelClass}>{title}</h2>
      {children}
    </section>
  );
}

export default function EditProfileForm({
  profile,
  row,
  userId,
  dateOfBirth: initialDateOfBirth,
}: {
  profile: PlayerProfile;
  /** Raw columns — the view model only carries display strings. */
  row: ProfileRow;
  userId: string;
  /** "YYYY-MM-DD" or "" — private, only ever loaded for the owner. */
  dateOfBirth: string;
}) {
  const router = useRouter();
  const { toast } = useNotifications();
  const { refreshUser } = useAuth();

  const [username, setUsername] = useState(profile.username);
  const [dobParts, setDobParts] = useState<DateParts>(() =>
    splitDate(initialDateOfBirth)
  );
  const [gender, setGender] = useState(profile.dossier.gender);
  const [languages, setLanguages] = useState<string[]>(row.languages);
  const [playDays, setPlayDays] = useState<string[]>(row.play_days);
  const [playStart, setPlayStart] = useState(trimSeconds(row.play_start));
  const [playEnd, setPlayEnd] = useState(trimSeconds(row.play_end));
  // A value that isn't a known offset (nothing writes one) falls back to the default.
  const [timezone, setTimezone] = useState(
    row.timezone && timezoneOptions.includes(row.timezone)
      ? row.timezone
      : DEFAULT_TIMEZONE
  );
  const [playstyle, setPlaystyle] = useState<number | undefined>(
    profile.playstyle
  );
  const [tags, setTags] = useState<string[]>([...profile.personalityTags]);
  const [handles, setHandles] = useState(() =>
    Object.fromEntries(
      profile.connections.map((account) => [account.provider, account.handle])
    )
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{
    username?: string;
    dateOfBirth?: string;
    schedule?: string;
    tags?: string;
    form?: string;
  }>({});

  function toggleDay(code: string) {
    setErrors((prev) => ({ ...prev, schedule: undefined }));
    setPlayDays((prev) =>
      prev.includes(code) ? prev.filter((d) => d !== code) : [...prev, code]
    );
  }

  function addLanguage(language: string) {
    if (!language) return;
    setLanguages((prev) =>
      prev.includes(language) || prev.length >= MAX_LANGUAGES
        ? prev
        : [...prev, language]
    );
  }

  function toggleTag(tag: string) {
    setErrors((prev) => ({ ...prev, tags: undefined }));
    setTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= MAX_TAGS) {
        setErrors((e) => ({
          ...e,
          tags: `Pick at most ${MAX_TAGS} — the matching score compares against the lobby's requested tags.`,
        }));
        return prev;
      }
      return [...prev, tag];
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const nextErrors: typeof errors = {};
    const usernameError = validateUsername(username);
    if (usernameError) nextErrors.username = usernameError;

    // Checked here for a readable message; a database trigger enforces the
    // same 13+ rule for anyone calling the API directly.
    const dateOfBirth = joinDate(dobParts);
    const filledParts = [dobParts.day, dobParts.month, dobParts.year].filter(
      Boolean
    ).length;
    const dateError =
      filledParts > 0 && filledParts < 3
        ? "Pick a day, month and year — or clear all three."
        : validateDateOfBirth(dateOfBirth);
    if (dateError) nextErrors.dateOfBirth = dateError;

    // The database requires start and end together (profiles_play_window_check).
    if (Boolean(playStart) !== Boolean(playEnd)) {
      nextErrors.schedule = "Set both a start and an end time.";
    }

    if (nextErrors.username || nextErrors.dateOfBirth || nextErrors.schedule) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    setErrors({});

    // Personality tags feed `T` and playstyle feeds `P` in the compatibility
    // score, so saving these changes lobby recommendations. Empty text
    // fields are stored as null, not "", so "Not set" stays the one way an
    // unset value is represented.
    const supabase = createClient();

    // The date of birth is private, so it lives in its own table. Only
    // written when it changed (it may have no row yet, hence upsert).
    if (dateOfBirth !== initialDateOfBirth) {
      const { error: dobError } = await supabase
        .from("profile_private")
        .upsert({ user_id: userId, date_of_birth: dateOfBirth || null });

      if (dobError) {
        setSaving(false);
        setErrors({ form: "Couldn't save your date of birth. Try again." });
        return;
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        username: username.trim(),
        gender: gender || null,
        languages,
        play_days: playDays,
        play_start: playStart || null,
        play_end: playEnd || null,
        // Only stored once there's a schedule, so a default the user never
        // chose isn't recorded as if they had.
        timezone: playDays.length > 0 || playStart ? timezone : null,
        playstyle: playstyle ?? null,
        personality_tags: tags,
      })
      .eq("id", userId);

    if (error) {
      setSaving(false);
      // 23505 = unique_violation, from the case-insensitive username index.
      setErrors(
        error.code === "23505"
          ? { username: "That username is already taken." }
          : { form: "Couldn't save your changes. Try again." }
      );
      return;
    }

    await refreshUser();
    toast({
      tone: "success",
      title: "Profile updated",
      body: "Your playstyle and tags feed straight into lobby recommendations.",
    });
    router.push("/profile/me");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <BackLink label="Back to profile" href="/profile/me" />

      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-extrabold tracking-tight text-white">
          Edit profile
        </h1>
        <p className="text-xs text-text-muted">
          Your rank, playstyle and personality tags are what lobbies get matched
          on — keeping them current improves your recommendations.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <Card title="Identity">
            <div className="flex items-center gap-4">
              {profile.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element -- avatar preview, no benefit from next/image optimization
                <img
                  src={profile.avatar}
                  alt=""
                  className="size-14 shrink-0 rounded-full border-2 border-border-strong object-cover"
                />
              ) : (
                <span className="flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-border-strong bg-brand/15 text-lg font-bold text-brand">
                  {profile.username.charAt(0).toUpperCase()}
                </span>
              )}
              {/* Upload needs Supabase Storage — not built yet. */}
              <button
                type="button"
                disabled
                title="Avatar upload is coming soon"
                className="flex h-9 items-center justify-center rounded-lg border border-border-strong px-4 text-xs font-semibold text-text-subtle opacity-50"
              >
                Change avatar
              </button>
            </div>

            <Field label="Username">
              <input
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setErrors((prev) => ({ ...prev, username: undefined }));
                }}
                aria-invalid={errors.username ? true : undefined}
                className={
                  errors.username
                    ? `${controlClass} border-danger focus:ring-danger`
                    : controlClass
                }
              />
              {errors.username && (
                <p className="text-[11px] text-danger">{errors.username}</p>
              )}
            </Field>

            <Field label="Date of birth">
              <DateOfBirthField
                parts={dobParts}
                onChange={(parts) => {
                  setDobParts(parts);
                  setErrors((prev) => ({ ...prev, dateOfBirth: undefined }));
                }}
                invalid={Boolean(errors.dateOfBirth)}
              />
              {errors.dateOfBirth ? (
                <p className="text-[11px] text-danger">{errors.dateOfBirth}</p>
              ) : (
                <p className="text-[11px] text-text-muted">
                  Private — others only see your age.
                </p>
              )}
            </Field>

            <Field label="Gender">
              <FormDropdown
                label="Gender"
                placeholder="Not set"
                value={gender}
                onChange={setGender}
                options={genderOptions.map((option) => ({
                  value: option,
                  label: option,
                }))}
              />
            </Field>

            <Field label="Languages">
              {languages.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {languages.map((language) => (
                    <span
                      key={language}
                      className="flex items-center gap-1.5 rounded-full bg-white/10 py-1 pl-2.5 pr-1.5 text-[11px] font-semibold text-text-subtle"
                    >
                      {language}
                      <button
                        type="button"
                        onClick={() =>
                          setLanguages((prev) =>
                            prev.filter((item) => item !== language)
                          )
                        }
                        aria-label={`Remove ${language}`}
                        className="flex size-4 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-white/10 hover:text-white"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {/* value stays "" so the dropdown resets after each pick */}
              <FormDropdown
                label="Add a language"
                placeholder={
                  languages.length >= MAX_LANGUAGES
                    ? `Up to ${MAX_LANGUAGES} languages`
                    : "Add a language…"
                }
                allowEmpty={false}
                disabled={languages.length >= MAX_LANGUAGES}
                value=""
                onChange={addLanguage}
                options={languageOptions
                  .filter((language) => !languages.includes(language))
                  .map((language) => ({ value: language, label: language }))}
              />
            </Field>
          </Card>

          <Card title="Playstyle">
            <div className="flex items-center gap-2">
              {playstyleScale.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPlaystyle(value)}
                  aria-pressed={playstyle === value}
                  className={`flex h-10 flex-1 items-center justify-center rounded-lg border text-xs font-bold transition-colors ${
                    playstyle === value
                      ? "border-brand bg-brand text-white"
                      : "border-border-strong text-text-muted hover:border-white/30 hover:text-white"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[11px] text-text-muted">
              <span>Very casual</span>
              <span>Very competitive</span>
            </div>
          </Card>

          <Card title="Personality tags">
            <p className="text-[11px] leading-relaxed text-text-muted">
              Pick up to {MAX_TAGS}. Lobby leaders list the tags they&apos;re
              looking for, and your overlap with them is scored directly.
            </p>
            <div className="flex flex-wrap gap-2">
              {personalityTagOptions.map((tag) => {
                const isSelected = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    aria-pressed={isSelected}
                    className={`rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
                      isSelected
                        ? "border-brand bg-brand/10 text-brand"
                        : "border-border-strong text-text-muted hover:border-white/30"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            <p
              className={`text-[11px] ${errors.tags ? "text-danger" : "text-text-muted"}`}
            >
              {errors.tags ?? `${tags.length}/${MAX_TAGS} selected`}
            </p>
          </Card>

          <Card title="Connected accounts">
            <div className="flex flex-col gap-3">
              {profile.connections.length === 0 && (
                <p className="rounded-lg border border-dashed border-border-default p-4 text-center text-xs text-text-muted">
                  No linked accounts yet — Discord, Steam and Riot linking
                  arrives with lobbies.
                </p>
              )}
              {profile.connections.map((account) => (
                <div key={account.provider} className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                  <img
                    src={account.icon}
                    alt=""
                    className="size-5 shrink-0 object-contain"
                  />
                  <label
                    htmlFor={`handle-${account.provider}`}
                    className="w-16 shrink-0 text-[11px] font-bold uppercase tracking-wide text-text-muted"
                  >
                    {account.label}
                  </label>
                  <input
                    id={`handle-${account.provider}`}
                    value={handles[account.provider] ?? ""}
                    onChange={(event) =>
                      setHandles((prev) => ({
                        ...prev,
                        [account.provider]: event.target.value,
                      }))
                    }
                    className={controlClass}
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>

        <aside className="flex flex-col gap-4">
          <Card title="Availability">
            <Field label="Days">
              <div className="flex flex-wrap gap-1.5">
                {playDayOptions.map((day) => {
                  const isSelected = playDays.includes(day.code);
                  return (
                    <button
                      key={day.code}
                      type="button"
                      onClick={() => toggleDay(day.code)}
                      aria-pressed={isSelected}
                      className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                        isSelected
                          ? "border-brand bg-brand/10 text-brand"
                          : "border-border-strong text-text-muted hover:border-white/30"
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="From">
                <TimeSelect
                  label="Play hours start"
                  value={playStart}
                  onChange={(value) => {
                    setPlayStart(value);
                    setErrors((prev) => ({ ...prev, schedule: undefined }));
                  }}
                />
              </Field>
              <Field label="Until">
                <TimeSelect
                  label="Play hours end"
                  value={playEnd}
                  onChange={(value) => {
                    setPlayEnd(value);
                    setErrors((prev) => ({ ...prev, schedule: undefined }));
                  }}
                />
              </Field>
            </div>

            <Field label="Timezone">
              <FormDropdown
                label="Timezone"
                value={timezone}
                onChange={setTimezone}
                options={timezoneOptions.map((option) => ({
                  value: option,
                  label: option,
                }))}
              />
            </Field>

            {errors.schedule && (
              <p className="text-[11px] text-danger">{errors.schedule}</p>
            )}
            <p className="text-[11px] leading-relaxed text-text-muted">
              Schedule overlap is one of the filters players search on. If the
              end time is earlier than the start (for example 8 PM – 1 AM), it
              runs past midnight.
            </p>
          </Card>

          <div className="flex flex-col gap-2 rounded-2xl border border-border-strong bg-bg-card-alt p-5">
            {errors.form && (
              <p className="text-[11px] text-danger">{errors.form}</p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex h-10 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <Link
              href="/profile/me"
              className="flex h-10 items-center justify-center rounded-lg border border-border-strong text-xs font-semibold text-text-muted transition-colors hover:text-white"
            >
              Discard
            </Link>
          </div>
        </aside>
      </div>
    </form>
  );
}
