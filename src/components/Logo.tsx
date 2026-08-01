import Image from "next/image";

export default function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand">
        <Image src="/icons/logo-mark.svg" alt="" width={17.5} height={14} />
      </div>
      <span className="font-display text-base font-black italic tracking-[-1px] text-white">
        TemanGame
      </span>
    </div>
  );
}
