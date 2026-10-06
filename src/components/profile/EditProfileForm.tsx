"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
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
import {
  AVATAR_ACCEPT,
  AVATAR_BUCKET,
  newAvatarPath,
  processAvatar,
} from "@/lib/avatar";
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
import { regionsFor } from "@/data/game-regions";
import {
  removeGameSetup,
  saveGameSetup,
  type GameInfo,
  type PlayerGameSetup,
} from "@/lib/games";
import {
  emptyGameProfile,
  type GameProfile,
} from "@/components/onboarding/RankRoleStep";

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
  catalog,
  gameSetups,
}: {
  profile: PlayerProfile;
  /** Raw columns — the view model only carries display strings. */
  row: ProfileRow;
  userId: string;
  /** "YYYY-MM-DD" or "" — private, only ever loaded for the owner. */
  dateOfBirth: string;
  /** Every game that can be added, with its ranks and roles. */
  catalog: GameInfo[];
  /** The games this player already has set up. */
  gameSetups: PlayerGameSetup[];
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
  // The picture is processed (cropped + shrunk) as soon as it's picked, so the
  // preview shows exactly what will be stored, but it is only uploaded on
  // Save — "Discard" really does discard it.
  const [newAvatar, setNewAvatar] = useState<{
    blob: Blob;
    previewUrl: string;
  } | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shownAvatar = removeAvatar
    ? ""
    : (newAvatar?.previewUrl ?? profile.avatar);

  // Frees the preview's object URL when it's replaced or the form closes.
  useEffect(
    () => () => {
      if (newAvatar) URL.revokeObjectURL(newAvatar.previewUrl);
    },
    [newAvatar]
  );

  // The player's games, keyed by game slug, in the order they were added.
  // A game that was saved before (`savedGameSlugs`) but is no longer in
  // `gameOrder` has been taken off, and Save deletes it.
  const [gameOrder, setGameOrder] = useState<string[]>(() =>
    gameSetups.map((setup) => setup.gameSlug)
  );
  const [games, setGames] = useState<Record<string, GameProfile>>(() =>
    Object.fromEntries(
      gameSetups.map((setup) => [
        setup.gameSlug,
        {
          username: setup.inGameName,
          region: setup.regionValue,
          rank: setup.rank,
          roles: setup.roles,
        },
      ])
    )
  );
  const savedGameSlugs = gameSetups.map((setup) => setup.gameSlug);

  function addGame(slug: string) {
    if (!slug || gameOrder.includes(slug)) return;
    setGameOrder((prev) => [...prev, slug]);
    setGames((prev) => ({ ...prev, [slug]: { ...emptyGameProfile } }));
  }

  function removeGame(slug: string) {
    setGameOrder((prev) => prev.filter((s) => s !== slug));
  }

  function updateGame(
    slug: string,
    patch:
      | Partial<GameProfile>
      | ((current: GameProfile) => Partial<GameProfile>)
  ) {
    setGames((prev) => {
      const current = prev[slug] ?? emptyGameProfile;
      const resolved = typeof patch === "function" ? patch(current) : patch;
      return { ...prev, [slug]: { ...current, ...resolved } };
    });
  }

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{
    username?: string;
    avatar?: string;
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
          tags: `You can pick up to ${MAX_TAGS} tags.`,
        }));
        return prev;
      }
      return [...prev, tag];
    });
  }

  async function handleAvatarPicked(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so picking the same file again still fires onChange.
    event.target.value = "";
    if (!file) return;

    setErrors((prev) => ({ ...prev, avatar: undefined }));
    try {
      const blob = await processAvatar(file);
      setNewAvatar({ blob, previewUrl: URL.createObjectURL(blob) });
      setRemoveAvatar(false);
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        avatar:
          error instanceof Error ? error.message : "Couldn't use that image.",
      }));
    }
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
        ? "Pick a day, month and year, or clear all three."
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
    // written when it changed (it may have no row yet, hence update, then
    // insert if nothing was updated).
    if (dateOfBirth !== initialDateOfBirth) {
      const dobValue = dateOfBirth || null;

      // Update first, insert only if there's no row yet. Not an upsert: that
      // compiles to INSERT … ON CONFLICT DO UPDATE SET user_id = …, which
      // needs UPDATE permission on `user_id`, and only `date_of_birth` is
      // granted on purpose (nobody should be able to re-point the row).
      const { data: updatedRows, error: updateError } = await supabase
        .from("profile_private")
        .update({ date_of_birth: dobValue })
        .eq("user_id", userId)
        .select("user_id");

      let dobError = updateError;
      if (!dobError && (updatedRows?.length ?? 0) === 0) {
        const { error: insertError } = await supabase
          .from("profile_private")
          .insert({ user_id: userId, date_of_birth: dobValue });
        dobError = insertError;
      }

      if (dobError) {
        setSaving(false);
        // 23514 = check_violation, raised by the minimum-age trigger.
        setErrors(
          dobError.code === "23514"
            ? { dateOfBirth: "You must be at least 13 years old." }
            : { form: "Couldn't save your date of birth. Try again." }
        );
        return;
      }
    }

    // Games come before the picture and the profile row on purpose. Saving a
    // game is safe to repeat, so a failure here just means "try again", whereas
    // doing it last could leave an uploaded picture orphaned on a retry.
    for (const slug of savedGameSlugs.filter((s) => !gameOrder.includes(s))) {
      const game = catalog.find((g) => g.slug === slug);
      if (!game) continue;
      const failure = await removeGameSetup(supabase, userId, game.id);
      if (failure) {
        setSaving(false);
        setErrors({ form: `Couldn't remove ${game.name}. Try again.` });
        return;
      }
    }

    for (const slug of gameOrder) {
      const game = catalog.find((g) => g.slug === slug);
      if (!game) continue;
      const details = games[slug] ?? emptyGameProfile;

      const failure = await saveGameSetup(supabase, userId, {
        gameId: game.id,
        inGameName: details.username,
        region: details.region || regionsFor(slug).default,
        rankId: game.ranks.find((rank) => rank.name === details.rank)?.id ?? null,
        roleIds: game.roles
          .filter((role) => details.roles.includes(role.name))
          .map((role) => role.id),
      });
      if (failure) {
        setSaving(false);
        setErrors({ form: `Couldn't save your ${game.name} details. Try again.` });
        return;
      }
    }

    // Upload first, record second: if the upload fails nothing changed, and
    // if recording fails the new file is removed again below. Each upload
    // gets a brand-new file name, so there's nothing to overwrite and no
    // stale cached copy to worry about.
    const oldAvatarPath = row.avatar_path;
    let uploadedPath: string | null = null;
    let nextAvatarPath: string | null | undefined; // undefined = unchanged

    if (newAvatar) {
      const path = newAvatarPath(userId);
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, newAvatar.blob, {
          contentType: "image/jpeg",
          cacheControl: "31536000", // a year — the name changes on every upload
        });

      if (uploadError) {
        setSaving(false);
        setErrors({ form: "Couldn't upload your picture. Try again." });
        return;
      }
      uploadedPath = path;
      nextAvatarPath = path;
    } else if (removeAvatar) {
      nextAvatarPath = null;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        ...(nextAvatarPath !== undefined && { avatar_path: nextAvatarPath }),
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
      // Don't leave the file we just uploaded orphaned in the bucket.
      if (uploadedPath) {
        await supabase.storage.from(AVATAR_BUCKET).remove([uploadedPath]);
      }
      setSaving(false);
      // 23505 = unique_violation, from the case-insensitive username index.
      setErrors(
        error.code === "23505"
          ? { username: "That username is already taken." }
          : { form: "Couldn't save your changes. Try again." }
      );
      return;
    }

    // The previous picture is now unreferenced. Best-effort: if this fails
    // the profile is already correct and only an unused file is left behind.
    if (nextAvatarPath !== undefined && oldAvatarPath) {
      await supabase.storage.from(AVATAR_BUCKET).remove([oldAvatarPath]);
    }

    await refreshUser();
    toast({
      tone: "success",
      title: "Profile updated",
      body: "Your changes have been saved.",
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
          Fill in your profile so other players know what to expect from you.
          The more you add, the easier it is to find a team that fits.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <Card title="Identity">
            <div className="flex items-center gap-4">
              {shownAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element -- avatar preview, no benefit from next/image optimization
                <img
                  src={shownAvatar}
                  alt=""
                  className="size-14 shrink-0 rounded-full border-2 border-border-strong object-cover"
                />
              ) : (
                <span className="flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-border-strong bg-brand/15 text-lg font-bold text-brand">
                  {profile.username.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-9 items-center justify-center rounded-lg border border-border-strong px-4 text-xs font-semibold text-text-subtle transition-colors hover:text-white"
                  >
                    {shownAvatar ? "Change avatar" : "Upload avatar"}
                  </button>
                  {shownAvatar && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewAvatar(null);
                        setRemoveAvatar(true);
                      }}
                      className="flex h-9 items-center justify-center rounded-lg px-3 text-xs font-semibold text-text-muted transition-colors hover:text-danger"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-text-muted">
                  Image should be at least 256 by 256 pixels.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={AVATAR_ACCEPT}
                onChange={handleAvatarPicked}
                className="hidden"
              />
            </div>
            {errors.avatar && (
              <p className="text-[11px] text-danger">{errors.avatar}</p>
            )}

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
                  Only your age is shown to other players.
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
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <p className={errors.tags ? "text-danger" : "text-text-muted"}>
                {errors.tags ?? `${tags.length}/${MAX_TAGS} selected`}
              </p>
              {/* The error already says the limit, so don't repeat it. */}
              {!errors.tags && (
                <p className="text-text-muted">Pick up to {MAX_TAGS}.</p>
              )}
            </div>
          </Card>

          <Card title="Games">
            {catalog.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border-default p-4 text-center text-xs text-text-muted">
                Games can&apos;t be loaded right now. Try again later.
              </p>
            ) : (
              <>
                {gameOrder.length === 0 && (
                  <p className="rounded-lg border border-dashed border-border-default p-4 text-center text-xs text-text-muted">
                    No games added yet.
                  </p>
                )}

                {gameOrder.map((slug) => {
                  const game = catalog.find((g) => g.slug === slug);
                  if (!game) return null;
                  const details = games[slug] ?? emptyGameProfile;
                  const regionList = regionsFor(slug);

                  return (
                    <div
                      key={slug}
                      className="flex flex-col gap-3 rounded-xl border border-border-default bg-bg-page p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-white">
                          {game.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeGame(slug)}
                          className="text-[11px] font-semibold text-text-muted transition-colors hover:text-danger"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="In-game name">
                          <input
                            value={details.username}
                            onChange={(event) =>
                              updateGame(slug, { username: event.target.value })
                            }
                            maxLength={40}
                            placeholder="e.g. Yonziii"
                            className={controlClass}
                          />
                        </Field>
                        <Field label="Region">
                          <FormDropdown
                            label={`${game.name} region`}
                            value={details.region || regionList.default}
                            onChange={(region) => updateGame(slug, { region })}
                            options={regionList.options}
                            allowEmpty={false}
                          />
                        </Field>
                      </div>

                      <Field label="Rank">
                        <FormDropdown
                          label={`${game.name} rank`}
                          placeholder="Not sure yet"
                          value={details.rank}
                          onChange={(rank) => updateGame(slug, { rank })}
                          options={game.ranks.map((rank) => ({
                            value: rank.name,
                            label: rank.name,
                          }))}
                        />
                      </Field>

                      {game.roles.length > 0 && (
                        <Field label="Roles">
                          <div className="flex flex-wrap gap-2">
                            {game.roles.map((role) => {
                              const isSelected = details.roles.includes(role.name);
                              return (
                                <button
                                  key={role.id}
                                  type="button"
                                  onClick={() =>
                                    updateGame(slug, (current) => ({
                                      roles: current.roles.includes(role.name)
                                        ? current.roles.filter(
                                            (r) => r !== role.name
                                          )
                                        : [...current.roles, role.name],
                                    }))
                                  }
                                  aria-pressed={isSelected}
                                  className={`rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
                                    isSelected
                                      ? "border-brand bg-brand/10 text-brand"
                                      : "border-border-strong text-text-muted hover:border-white/30"
                                  }`}
                                >
                                  {role.name}
                                </button>
                              );
                            })}
                          </div>
                        </Field>
                      )}
                    </div>
                  );
                })}

                {catalog.some((g) => !gameOrder.includes(g.slug)) && (
                  <FormDropdown
                    label="Add a game"
                    placeholder="Add a game…"
                    allowEmpty={false}
                    value=""
                    onChange={addGame}
                    options={catalog
                      .filter((g) => !gameOrder.includes(g.slug))
                      .map((g) => ({ value: g.slug, label: g.name }))}
                  />
                )}
              </>
            )}
          </Card>

          <Card title="Connected accounts">
            <div className="flex flex-col gap-3">
              {profile.connections.length === 0 && (
                <p className="rounded-lg border border-dashed border-border-default p-4 text-center text-xs text-text-muted">
                  No linked accounts yet. Discord, Steam and Riot linking is
                  coming soon.
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
