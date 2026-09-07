"use client";

import { useEffect, useState } from "react";
import BackLink from "@/components/BackLink";
import { readOutsideSocial, SOCIAL_FALLBACK } from "@/lib/section-origin";

/**
 * Leaves Social entirely rather than stepping back through its sub-pages.
 * Resolved after mount because sessionStorage can't be read during SSR.
 */
export default function SocialBackLink() {
  const [href, setHref] = useState(SOCIAL_FALLBACK);

  useEffect(() => {
    const origin = readOutsideSocial();
    // Runs once on mount to hydrate client-only sessionStorage state, which
    // isn't readable during SSR — same exemption as AuthContext.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (origin) setHref(origin);
  }, []);

  return <BackLink label="Back" href={href} />;
}
