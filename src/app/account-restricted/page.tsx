import type { Metadata } from "next";
import AccountRestricted from "@/components/auth/AccountRestricted";

export const metadata: Metadata = {
  title: "Account restricted — TemanGame",
  robots: { index: false, follow: false },
};

export default function AccountRestrictedPage() {
  return <AccountRestricted />;
}
