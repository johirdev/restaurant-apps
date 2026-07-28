"use client";

import Link from "next/link";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbLinkProps = {
  items: BreadcrumbItem[];
};

export default function BreadcrumbLink({ items }: BreadcrumbLinkProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="bg-app border-default p-5 mb-5 rounded-md backdrop-blur-xl sticky top-[-12px] z-30"
    >
      <ul className="flex items-center justify-start gap-3">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} aria-current={isLast ? "page" : undefined}>
              <div className="flex items-center gap-3">
                {/* Separator */}
                {index !== 0 && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="size-2.5 overflow-visible"
                    style={{ fill: "var(--text-muted)" }}
                    viewBox="0 0 451.847 451.847"
                    aria-hidden="true"
                  >
                    <path d="M345.441 248.292 151.154 442.573c-12.359 12.365-32.397 12.365-44.75 0-12.354-12.354-12.354-32.391 0-44.744L278.318 225.92 106.409 54.017c-12.354-12.359-12.354-32.394 0-44.748 12.354-12.359 32.391-12.359 44.75 0l194.287 194.284c6.177 6.18 9.262 14.271 9.262 22.366 0 8.099-3.091 16.196-9.267 22.373" />
                  </svg>
                )}

                {/* Item */}
                {isLast ? (
                  <span className="text-secondary text-sm leading-snug font-medium">
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href || "#"}
                    className="text-primary font-medium text-sm leading-snug hover:text-highlight focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded transition-colors"
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
