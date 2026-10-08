/**
 * Shared layout pieces for long-form legal pages (Privacy Policy, Terms of
 * Service, …) — a big bold H2 per section, optional numbered sub-sections,
 * and bullet points with a bold lead label. Keeping these here instead of
 * duplicating them per page means every legal doc reads the same way.
 */

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5 border-t border-border-default pt-10 first:border-t-0 first:pt-0">
      <h2 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
        {title}
      </h2>
      <div className="flex flex-col gap-5 text-sm leading-relaxed text-text-subtle sm:text-[15px]">
        {children}
      </div>
    </section>
  );
}

export function LegalSubSection({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <h3 className="text-sm font-bold text-white sm:text-base">
        {number}. {title}
      </h3>
      <div className="flex flex-col gap-2.5 pl-0 text-sm leading-relaxed text-text-subtle sm:pl-1 sm:text-[15px]">
        {children}
      </div>
    </div>
  );
}

export function LegalBullet({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <span className="font-semibold text-white">{label}:</span> {children}
    </li>
  );
}
