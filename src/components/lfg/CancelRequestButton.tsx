"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { leaveLobby } from "@/lib/lobbies";
import { useNotifications } from "@/contexts/NotificationContext";
import ConfirmDialog from "@/components/lobby/ConfirmDialog";

/**
 * Takes back a join request straight from the LFG card. Asks in a pop-up
 * first, the same one the lobby page's "Cancel request" opens.
 */
export default function CancelRequestButton({
  lobbyId,
  lobbyName,
}: {
  lobbyId: string;
  lobbyName?: string;
}) {
  const router = useRouter();
  const { toast } = useNotifications();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function withdraw() {
    setBusy(true);
    const failure = await leaveLobby(createClient(), lobbyId);
    setBusy(false);
    setOpen(false);
    if (failure) {
      toast({ tone: "danger", title: "Couldn't cancel the request", body: failure });
      return;
    }
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Take back your request to join"
        className="flex h-6 items-center justify-center rounded-md border border-white/15 px-2 text-xs font-bold text-text-muted transition-colors hover:border-danger hover:text-danger"
      >
        Cancel
      </button>
      {open && (
        <WithdrawDialog
          lobbyName={lobbyName}
          busy={busy}
          onConfirm={withdraw}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/** The one wording for taking back a join request, on the card and the lobby page. */
export function WithdrawDialog({
  lobbyName,
  busy,
  onConfirm,
  onClose,
}: {
  lobbyName?: string;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <ConfirmDialog
      title="Cancel your request?"
      body={
        <>
          The leader of {lobbyName ? <b className="text-white">{lobbyName}</b> : "this lobby"} won&apos;t
          see it any more. You can ask to join again later while the lobby is recruiting.
        </>
      }
      confirmLabel="Cancel request"
      cancelLabel="Keep it"
      busy={busy}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}
