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
import { joinDate, splitDate, type DateParts } from "@/lib/age";
import { trimSeconds } from "@/lib/availability";
import {
  AVATAR_ACCEPT,
  AVATAR_BUCKET,
  newAvatarPath,
  processAvatar,
} from "@/lib/avatar";
import { saveDateOfBirth, type ProfileRow } from "@/lib/profiles";
import {
  saveUserGames,
  type CatalogueGame,
  type UserGame,
} from "@/lib/user-games";
import {
  DEFAULT_TIMEZONE,
  MAX_PERSONALITY_TAGS,
  timezoneOptions,
} from "@/data/profile-options";
import BackLink from "@/components/BackLink";
import {
  DateOfBirthField,
  Field,
  GenderField,
  LanguagesField,
  ScheduleFields,
  controlClass,
  labelClass,
  validateDossier,
} from "./DossierFields";
import GamesEditor from "./GamesEditor";

const MAX_TAGS = MAX_PERSONALITY_TAGS;
const playstyleScale = [1, 2, 3, 4, 5];

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
  games: initialGames,
  catalogue,
}: {
  profile: PlayerProfile;
  /** Raw columns — the view model only carries display strings. */
  row: ProfileRow;
  userId: string;
  /** "YYYY-MM-DD" or "" — private, only ever loaded for the owner. */
  dateOfBirth: string;
  /** Rows from `user_game_mapping`, as loaded. */
  games: UserGame[];
  /** Games, ranks and roles as the database defines them. */
  catalogue: CatalogueGame[];
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
  const [schedule, setSchedule] = useState({
    days: row.play_days,
    start: trimSeconds(row.play_start),
    end: trimSeconds(row.play_end),
    // A value that isn't a known offset (nothing writes one) falls back to
    // the default.
    timezone:
      row.timezone && timezoneOptions.includes(row.timezone)
        ? row.timezone
        : DEFAULT_TIMEZONE,
  });
  const [playstyle, setPlaystyle] = useState<number | undefined>(
    profile.playstyle
  );
  const [tags, setTags] = useState<string[]>([...profile.personalityTags]);
  const [games, setGames] = useState<UserGame[]>(initialGames);
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

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{
    username?: string;
    avatar?: string;
    dateOfBirth?: string;
    schedule?: string;
    tags?: string;
    games?: string;
    form?: string;
  }>({});

  function updateSchedule(patch: Partial<typeof schedule>) {
    setErrors((prev) => ({ ...prev, schedule: undefined }));
    setSchedule((prev) => ({ ...prev, ...patch }));
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

    // Date-of-birth and schedule rules are shared with onboarding; the
    // database enforces the same ones for anyone calling the API directly.
    const nextErrors: typeof errors = {
      ...validateDossier({ dobParts, schedule }),
    };
    const usernameError = validateUsername(username);
    if (usernameError) nextErrors.username = usernameError;
    const dateOfBirth = joinDate(dobParts);

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
      const dobError = await saveDateOfBirth(
        supabase,
        userId,
        dateOfBirth || null
      );

      if (dobError) {
        setSaving(false);
        setErrors({ dateOfBirth: dobError });
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
        play_days: schedule.days,
        play_start: schedule.start || null,
        play_end: schedule.end || null,
        // Only stored once there's a schedule, so a default the user never
        // chose isn't recorded as if they had.
        timezone:
          schedule.days.length > 0 || schedule.start ? schedule.timezone : null,
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

    const gamesError = await saveUserGames(supabase, userId, games, initialGames);
    if (gamesError) {
      setSaving(false);
      setErrors({ games: gamesError });
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
              <GenderField value={gender} onChange={setGender} />
            </Field>

            <Field label="Languages">
              <LanguagesField languages={languages} onChange={setLanguages} />
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

          <Card title="Games you play">
            <p className="text-[11px] text-text-muted">
              Rank and role are what you type here — nothing is read from the
              game, so keep it honest and teammates can trust it.
            </p>
            <GamesEditor
              games={games}
              catalogue={catalogue}
              onChange={setGames}
            />
            {errors.games && (
              <p className="text-[11px] text-danger">{errors.games}</p>
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
            <ScheduleFields
              schedule={schedule}
              onChange={updateSchedule}
              error={errors.schedule}
            />
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
