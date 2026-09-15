"use client";

import { useState } from "react";
import Link from "next/link";
import { useAdminData } from "@/contexts/AdminDataContext";
import type { AdminActionType } from "@/data/admin-moderation";
import { adminActionLabels } from "@/data/admin-nav";
import { adminAccounts, adminName } from "@/data/admin-accounts";
import { actionTarget, formatDateTime } from "@/lib/admin";
import {
  AdminPageHeader,
  AdminTable,
  EmptyRow,
  adminFieldClass,
} from "./AdminUi";

/**
 * Append-only record of every moderation decision. Nothing here can be edited
 * or undone — reversing a decision (lifting a sanction) is itself a new entry.
 */
export default function AuditLog() {
  const { actions, players, lobbies, reports } = useAdminData();
  const [type, setType] = useState<AdminActionType | "all">("all");
  const [adminId, setAdminId] = useState("all");

  const visible = actions
    .filter((action) => type === "all" || action.type === type)
    .filter((action) => adminId === "all" || action.adminId === adminId)
    .sort((a, b) => b.at.localeCompare(a.at));

  const selects = [
    {
      label: "Filter by action",
      value: type,
      onChange: (value: string) => setType(value as AdminActionType | "all"),
      options: [
        { value: "all", label: "All actions" },
        ...(Object.keys(adminActionLabels) as AdminActionType[]).map((key) => ({
          value: key,
          label: adminActionLabels[key],
        })),
      ],
    },
    {
      label: "Filter by admin",
      value: adminId,
      onChange: setAdminId,
      options: [
        { value: "all", label: "All admins" },
        ...adminAccounts.map((account) => ({ value: account.id, label: account.name })),
      ],
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Audit log"
        description="Every moderation decision, who made it and why. Entries can't be edited or deleted."
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        {selects.map((select) => (
          <div key={select.label} className="relative sm:w-52">
            <select
              value={select.value}
              onChange={(event) => select.onChange(event.target.value)}
              aria-label={select.label}
              className={`${adminFieldClass} h-8 appearance-none pr-9`}
            >
              {select.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
            <img
              src="/icons/lfg-select-chevron.svg"
              alt=""
              className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 opacity-50"
            />
          </div>
        ))}
      </div>

      <AdminTable head={["When", "Admin", "Action", "Target", "Reason"]} minWidth="min-w-[860px]">
        {visible.length === 0 ? (
          <EmptyRow colSpan={5} label="No entries match." />
        ) : (
          visible.map((action) => {
            const target = actionTarget(action, { players, lobbies, reports });
            return (
              <tr key={action.id} className="align-top">
                <td className="whitespace-nowrap px-4 py-3 text-text-muted">
                  {formatDateTime(action.at)}
                </td>
                <td className="px-4 py-3 font-semibold text-white">
                  {adminName(action.adminId)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-text-subtle">
                  {action.summary}
                </td>
                <td className="px-4 py-3">
                  <Link href={target.href} className="font-semibold text-brand hover:opacity-80">
                    {action.targetType === "report"
                      ? action.targetId
                      : target.label}
                  </Link>
                </td>
                <td className="max-w-[340px] px-4 py-3 leading-relaxed text-text-muted">
                  {action.reason || "—"}
                </td>
              </tr>
            );
          })
        )}
      </AdminTable>
    </>
  );
}
