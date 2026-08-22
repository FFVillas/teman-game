interface LfgPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function LfgPagination({
  currentPage,
  totalPages,
  onPageChange,
}: LfgPaginationProps) {
  const pages = [1, 2, 3].filter((page) => page <= totalPages);

  return (
    <div className="flex items-center justify-center gap-2 pb-12 pt-4">
      <button
        type="button"
        aria-label="Previous page"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="flex size-8 items-center justify-center rounded-lg border border-white/10 text-white/70 transition-colors hover:border-white/20 disabled:opacity-40"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
        <img src="/icons/lfg-pagination-prev.svg" alt="" className="h-4 w-2.5" />
      </button>

      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onPageChange(page)}
          aria-current={page === currentPage ? "page" : undefined}
          className={`flex size-8 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
            page === currentPage
              ? "bg-brand text-white"
              : "border border-white/10 text-[#94a3b8] hover:border-white/20"
          }`}
        >
          {page}
        </button>
      ))}

      {totalPages > pages.length + 1 && (
        <span className="flex size-8 items-center justify-center text-sm text-[#64748b]">
          …
        </span>
      )}

      {totalPages > pages.length && (
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          aria-current={totalPages === currentPage ? "page" : undefined}
          className={`flex size-8 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
            totalPages === currentPage
              ? "bg-brand text-white"
              : "border border-white/10 text-[#94a3b8] hover:border-white/20"
          }`}
        >
          {totalPages}
        </button>
      )}

      <button
        type="button"
        aria-label="Next page"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="flex size-8 items-center justify-center rounded-lg border border-white/10 text-white/70 transition-colors hover:border-white/20 disabled:opacity-40"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon, no benefit from next/image optimization */}
        <img src="/icons/lfg-pagination-next.svg" alt="" className="h-4 w-2.5" />
      </button>
    </div>
  );
}
