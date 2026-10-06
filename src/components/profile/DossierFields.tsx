"use client";

import type { ReactNode } from "react";
import FormDropdown from "@/components/FormDropdown";
import { daysInMonth, joinDate, validateDateOfBirth, MINIMUM_AGE, type DateParts } from "@/lib/age";
import { formatTime, timeOptions } from "@/lib/availability";
import {
  languageOptions,
  MAX_LANGUAGES,
  monthNames,
  playDayOptions,
  timezoneOptions,
} from "@/data/profile-options";

/**
 * The account-level "player dossier" inputs — date of birth, gender,
 * languages and usual play hours. Shared by the profile edit form and the
 * onboarding step so the two can't drift apart: same vocabulary, same
 * validation, same shape written to `profiles` / `profile_private`.
 */

export const controlClass =
  "w-full rounded-lg border border-border-strong bg-bg-page px-3 py-2.5 text-xs text-white placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brand";
export const labelClass =
  "text-[11px] font-bold uppercase tracking-widest text-text-muted";

export const genderOptions = ["Male", "Female", "Prefer not to say"];

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      {children}
    </div>
  );
}

/** Half-hour steps. A saved time that isn't on the grid is kept as an option. */
export function TimeSelect({
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
export function DateOfBirthField({
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

export function GenderField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <FormDropdown
      label="Gender"
      placeholder="Not set"
      value={value}
      onChange={onChange}
      options={genderOptions.map((option) => ({ value: option, label: option }))}
    />
  );
}

/** Chips for what's picked, plus a dropdown that resets after each pick. */
export function LanguagesField({
  languages,
  onChange,
}: {
  languages: string[];
  onChange: (languages: string[]) => void;
}) {
  const isFull = languages.length >= MAX_LANGUAGES;

  return (
    <>
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
                  onChange(languages.filter((item) => item !== language))
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
      <FormDropdown
        label="Add a language"
        placeholder={isFull ? `Up to ${MAX_LANGUAGES} languages` : "Add a language…"}
        allowEmpty={false}
        disabled={isFull}
        value=""
        onChange={(language) => {
          if (!language || languages.includes(language) || isFull) return;
          onChange([...languages, language]);
        }}
        options={languageOptions
          .filter((language) => !languages.includes(language))
          .map((language) => ({ value: language, label: language }))}
      />
    </>
  );
}

export interface Schedule {
  days: string[];
  start: string;
  end: string;
  timezone: string;
}

export function ScheduleFields({
  schedule,
  onChange,
  error,
}: {
  schedule: Schedule;
  onChange: (patch: Partial<Schedule>) => void;
  error?: string;
}) {
  return (
    <>
      <Field label="Days">
        <div className="flex flex-wrap gap-1.5">
          {playDayOptions.map((day) => {
            const isSelected = schedule.days.includes(day.code);
            return (
              <button
                key={day.code}
                type="button"
                onClick={() =>
                  onChange({
                    days: isSelected
                      ? schedule.days.filter((d) => d !== day.code)
                      : [...schedule.days, day.code],
                  })
                }
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
            value={schedule.start}
            onChange={(start) => onChange({ start })}
          />
        </Field>
        <Field label="Until">
          <TimeSelect
            label="Play hours end"
            value={schedule.end}
            onChange={(end) => onChange({ end })}
          />
        </Field>
      </div>

      <Field label="Timezone">
        <FormDropdown
          label="Timezone"
          value={schedule.timezone}
          onChange={(timezone) => onChange({ timezone })}
          options={timezoneOptions.map((option) => ({
            value: option,
            label: option,
          }))}
        />
      </Field>

      {error && <p className="text-[11px] text-danger">{error}</p>}
    </>
  );
}

/**
 * The two rules both screens share: a date of birth is all three parts or
 * none (and 13+), and the database requires a start *and* an end time
 * together (`profiles_play_window_check`).
 */
export function validateDossier({
  dobParts,
  schedule,
}: {
  dobParts: DateParts;
  schedule: Pick<Schedule, "start" | "end">;
}): { dateOfBirth?: string; schedule?: string } {
  const errors: { dateOfBirth?: string; schedule?: string } = {};

  const filledParts = [dobParts.day, dobParts.month, dobParts.year].filter(
    Boolean
  ).length;
  const dateError =
    filledParts > 0 && filledParts < 3
      ? "Pick a day, month and year, or clear all three."
      : validateDateOfBirth(joinDate(dobParts));
  if (dateError) errors.dateOfBirth = dateError;

  if (Boolean(schedule.start) !== Boolean(schedule.end)) {
    errors.schedule = "Set both a start and an end time.";
  }

  return errors;
}
