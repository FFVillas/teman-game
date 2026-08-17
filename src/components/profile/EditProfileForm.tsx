"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  personalityTagOptions,
  type PlayerProfile,
} from "@/data/player-profiles";
import { regions } from "@/data/regions";

const MAX_TAGS = 3;

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
}: {
  profile: PlayerProfile;
}) {
  const router = useRouter();

  const [username, setUsername] = useState(profile.username);
  const [age, setAge] = useState(String(profile.dossier.age));
  const [gender, setGender] = useState(profile.dossier.gender);
  const [languages, setLanguages] = useState(profile.dossier.languages);
  const [availability, setAvailability] = useState(
    profile.dossier.availability
  );
  const [region, setRegion] = useState<string>(profile.region);
  const [tags, setTags] = useState<string[]>([...profile.personalityTags]);
  const [handles, setHandles] = useState(() =>
    Object.fromEntries(
      profile.connections.map((account) => [account.provider, account.handle])
    )
  );
  const [errors, setErrors] = useState<{ username?: string; tags?: string }>({});

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

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!username.trim()) {
      setErrors((prev) => ({ ...prev, username: "Username can't be empty." }));
      return;
    }

    // TODO: PATCH the profile, then revalidate. Personality tags feed `T` in
    // the compatibility score, so changing them changes recommendations.
    router.push("/profile/me");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Link
        href="/profile/me"
        className="flex w-fit items-center gap-2 text-sm font-medium text-text-muted transition-colors hover:text-white"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
        <img src="/icons/lfg-back-arrow.svg" alt="" className="size-4" />
        Back to profile
      </Link>

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
              {/* eslint-disable-next-line @next/next/no-img-element -- avatar preview, no benefit from next/image optimization */}
              <img
                src={profile.avatar}
                alt=""
                className="size-14 shrink-0 rounded-full border-2 border-border-strong object-cover"
              />
              <button
                type="button"
                className="flex h-9 items-center justify-center rounded-lg border border-border-strong px-4 text-xs font-semibold text-text-subtle transition-colors hover:text-white"
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

            <div className="grid grid-cols-2 gap-3">
              <Field label="Age">
                <input
                  type="number"
                  min={13}
                  max={99}
                  value={age}
                  onChange={(event) => setAge(event.target.value)}
                  className={controlClass}
                />
              </Field>
              <Field label="Gender">
                <select
                  value={gender}
                  onChange={(event) => setGender(event.target.value)}
                  className={`${controlClass} appearance-none`}
                >
                  {genderOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Languages">
              <input
                value={languages}
                onChange={(event) => setLanguages(event.target.value)}
                placeholder="e.g. Indonesia (Native), English (B2)"
                className={controlClass}
              />
            </Field>
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
            <Field label="Region">
              <select
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                className={`${controlClass} appearance-none`}
              >
                {regions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Usual play hours">
              <textarea
                value={availability}
                onChange={(event) => setAvailability(event.target.value)}
                rows={3}
                placeholder="e.g. Weeknights 8PM - 12AM WIB"
                className={`${controlClass} resize-none leading-relaxed`}
              />
            </Field>
            <p className="text-[11px] leading-relaxed text-text-muted">
              Schedule overlap is one of the filters players search on, so be
              specific about your timezone.
            </p>
          </Card>

          <div className="flex flex-col gap-2 rounded-2xl border border-border-strong bg-bg-card-alt p-5">
            <button
              type="submit"
              className="flex h-10 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white transition-opacity hover:opacity-90"
            >
              Save changes
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
