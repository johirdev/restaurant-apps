// src/app/Layout/Pagination/Pagination.tsx
"use client";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;

  // ---- optional: left-side summary + limit selector ----
  total?: number;
  limit?: number;
  limitOptions?: number[];
  onLimitChange?: (limit: number) => void;
}

const DOTS = "...";

function getPageRange(
  page: number,
  totalPages: number,
  siblingCount: number,
): (number | string)[] {
  const totalNumbers = siblingCount * 2 + 5;

  if (totalPages <= totalNumbers) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSibling = Math.max(page - siblingCount, 1);
  const rightSibling = Math.min(page + siblingCount, totalPages);

  const showLeftDots = leftSibling > 2;
  const showRightDots = rightSibling < totalPages - 1;

  if (!showLeftDots && showRightDots) {
    const leftRange = Array.from(
      { length: 3 + siblingCount * 2 },
      (_, i) => i + 1,
    );
    return [...leftRange, DOTS, totalPages];
  }

  if (showLeftDots && !showRightDots) {
    const rightRange = Array.from(
      { length: 3 + siblingCount * 2 },
      (_, i) => totalPages - (3 + siblingCount * 2) + i + 1,
    );
    return [1, DOTS, ...rightRange];
  }

  const middleRange = Array.from(
    { length: rightSibling - leftSibling + 1 },
    (_, i) => leftSibling + i,
  );
  return [1, DOTS, ...middleRange, DOTS, totalPages];
}

export const Pagination = ({
  page,
  totalPages,
  onPageChange,
  siblingCount = 1,
  total,
  limit,
  limitOptions,
  onLimitChange,
}: PaginationProps) => {
  if (totalPages <= 1 && !total) return null;

  const pages = getPageRange(page, totalPages, siblingCount);

  const btnBase =
    "min-w-[32px] h-8 px-2 rounded-md text-[12px] font-medium flex items-center justify-center transition-colors";

  const showingFrom =
    total !== undefined && limit ? (page - 1) * limit + 1 : undefined;
  const showingTo =
    total !== undefined && limit ? Math.min(page * limit, total) : undefined;

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mt-5">
      {/* ---- LEFT: limit selector + summary ---- */}
      <div className="flex items-center gap-3 flex-wrap">
        {limitOptions && onLimitChange && limit !== undefined && (
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="input-field h-8 px-2 text-[12px] w-auto"
          >
            {limitOptions.map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        )}
        {total !== undefined && (
          <p className="text-[12px] text-secondary whitespace-nowrap">
            Showing {showingFrom}–{showingTo} of {total}
          </p>
        )}
      </div>

      {/* ---- RIGHT: numbered pagination ---- */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            className={`${btnBase} border-default text-secondary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            ‹
          </button>

          {pages.map((p, idx) =>
            p === DOTS ? (
              <span
                key={`dots-${idx}`}
                className="min-w-[32px] h-8 flex items-center justify-center text-[12px] text-muted"
              >
                {DOTS}
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p as number)}
                aria-label={`Go to page ${p}`}
                aria-current={p === page ? "page" : undefined}
                className={btnBase}
                style={
                  p === page
                    ? { background: "var(--accent-blue)", color: "#fff" }
                    : {
                        background: "var(--bg-input)",
                        color: "var(--text-secondary, inherit)",
                      }
                }
              >
                {p}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
            className={`${btnBase} border-default text-secondary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
};

export default Pagination;
