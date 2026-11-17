import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.04] ${className}`} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div
          aria-busy
          className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-6 py-12"
        >
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}

/** What a lobby list shows while its data loads. */
export function ListSkeleton() {
  return (
    <Shell>
      <Block className="h-9 w-2/3" />
      <Block className="h-14 w-full" />
      <Block className="h-10 w-1/3" />
      <div className="grid grid-cols-1 gap-6 pt-2 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Block key={index} className="h-[210px]" />
        ))}
      </div>
    </Shell>
  );
}

/** What a lobby, a profile or a form shows while its data loads. */
export function DetailSkeleton() {
  return (
    <Shell>
      <Block className="h-5 w-28" />
      <Block className="h-44 w-full" />
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Block className="h-72" />
        <Block className="h-72" />
      </div>
    </Shell>
  );
}
