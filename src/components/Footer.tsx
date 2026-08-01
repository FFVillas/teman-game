import Link from "next/link";
import Logo from "./Logo";
import {
  footerGameLinks,
  footerCompanyLinks,
  socialLinks,
  legalLinks,
} from "@/data/footer";

export default function Footer() {
  return (
    <footer className="w-full border-t border-border-subtle bg-bg-surface px-6 py-12 sm:px-10 lg:px-20">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-12">
        <div className="flex flex-wrap items-start justify-between gap-12">
          <div className="flex max-w-[320px] min-w-[280px] flex-col gap-6">
            <Logo />
            <p className="text-sm leading-[1.625] text-text-muted">
              Connect with competitive players across the globe. Join the
              best LFG platform for hardcore gamers.
            </p>
          </div>

          <div className="flex flex-wrap gap-16 sm:gap-20">
            <div className="flex min-w-[128px] flex-col gap-6">
              <h5 className="text-base font-bold tracking-[0.1px] text-white">
                Games
              </h5>
              <ul className="flex flex-col gap-4">
                {footerGameLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-text-muted transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex min-w-[87px] flex-col gap-6">
              <h5 className="text-base font-bold text-white">Company</h5>
              <ul className="flex flex-col gap-4">
                {footerCompanyLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-text-muted transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-4">
              <h5 className="text-base font-bold tracking-[-0.03px] text-white">
                Socials
              </h5>
              <ul className="flex items-start gap-4 pt-[1px]">
                {socialLinks.map((social) => (
                  <li key={social.label}>
                    <Link
                      href={social.href}
                      aria-label={social.label}
                      className={`flex size-10 items-center justify-center rounded-full border border-border-default ${social.bg} transition-opacity hover:opacity-90`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
                      <img
                        src={social.icon}
                        alt=""
                        width={social.iconWidth}
                        height={social.iconHeight}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col items-center gap-4 border-t border-border-subtle pt-8 sm:flex-row sm:justify-between sm:gap-0 sm:border-t-0 sm:pt-0">
          <p className="text-xs text-text-muted">
            © 2026 TemanGame All rights reserved.
          </p>
          <ul className="flex items-start gap-6">
            {legalLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="text-xs text-text-muted transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
