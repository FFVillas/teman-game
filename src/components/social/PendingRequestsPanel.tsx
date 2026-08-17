import PendingRequestRow from "./PendingRequestRow";
import { pendingRequests } from "@/data/social-pending";

export default function PendingRequestsPanel() {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border-default px-6 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
        <img src="/icons/social-inbox.svg" alt="" className="h-auto w-4 opacity-70" />
        <span className="text-base font-bold text-white">Pending Requests</span>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-6">
        {pendingRequests.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-16 text-sm text-text-muted">
            No pending requests.
          </div>
        ) : (
          pendingRequests.map((request) => (
            <PendingRequestRow key={request.id} request={request} />
          ))
        )}
      </div>
    </div>
  );
}
