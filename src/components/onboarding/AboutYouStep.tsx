"use client";

import type { DateParts } from "@/lib/age";
import {
  DateOfBirthField,
  Field,
  GenderField,
  LanguagesField,
  MinorNotice,
  ScheduleFields,
  type Schedule,
} from "@/components/profile/DossierFields";

export interface AboutYou {
  dobParts: DateParts;
  gender: string;
  languages: string[];
  schedule: Schedule;
}

/**
 * Account-level profile details, asked during signup rather than left for
 * the edit form: an empty profile is the thing teammates can't judge, and a
 * player who fills none of this is invisible to the filters other people
 * search with. The date of birth is required (under 18 needs a guardian, UU PDP) and this step
 * can't be skipped; everything else stays optional, and anything left blank
 * renders as "Not set" rather than a guess.
 *
 * The inputs themselves are the same components the edit form uses, so the
 * vocabulary and validation can't drift (see profile/DossierFields.tsx).
 */
export default function AboutYouStep({
  value,
  onChange,
  errors,
}: {
  value: AboutYou;
  onChange: (patch: Partial<AboutYou>) => void;
  errors: { dateOfBirth?: string; schedule?: string };
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-white">About you</h2>
        <p className="text-sm text-text-muted">
          Teammates use this to judge whether you fit before they invite you.
          Only your date of birth is required; the rest is optional.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        <Field label="Date of birth" required>
          <DateOfBirthField
            parts={value.dobParts}
            onChange={(dobParts) => onChange({ dobParts })}
            invalid={Boolean(errors.dateOfBirth)}
          />
          {errors.dateOfBirth ? (
            <p className="text-[11px] text-danger">{errors.dateOfBirth}</p>
          ) : (
            <p className="text-[11px] text-text-muted">
              Only your age is shown to other players, never the date.
            </p>
          )}
          <MinorNotice parts={value.dobParts} />
        </Field>

        <Field label="Gender">
          <GenderField
            value={value.gender}
            onChange={(gender) => onChange({ gender })}
          />
        </Field>

        <Field label="Languages you play in">
          <LanguagesField
            languages={value.languages}
            onChange={(languages) => onChange({ languages })}
          />
        </Field>

        <div className="flex flex-col gap-4 rounded-xl border border-border-default bg-bg-page p-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold text-white">
              When do you usually play?
            </span>
            <span className="text-[11px] text-text-muted">
              Lobbies are short-lived, so overlapping hours matter more than
              anything else here.
            </span>
          </div>
          <ScheduleFields
            schedule={value.schedule}
            onChange={(patch) =>
              onChange({ schedule: { ...value.schedule, ...patch } })
            }
            error={errors.schedule}
          />
        </div>
      </div>
    </div>
  );
}
