"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2, LogOut, ReceiptText, User, UtensilsCrossed } from "lucide-react";
import { useUser } from "@/src/app/components/Clients/Auth/UserProvider";

/* ==========================================================================
   অ্যাকাউন্ট এরিয়ার মোড়ক
   --------------------------------------------------------------------------
   একটাই জায়গায় গার্ড — লগইন না থাকলে /login এ পাঠায় আর সাথে `next`
   দিয়ে দেয়, যাতে লগইনের পর ঠিক এই পেজেই ফেরত আসে।
   ========================================================================== */

const TABS = [
  { href: "/account", label: "Profile", icon: User },
  { href: "/account/orders", label: "My orders", icon: ReceiptText },
  { href: "/account/dishes", label: "Dishes I ordered", icon: UtensilsCrossed },
];

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isLoggedIn, logout } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, isLoggedIn, pathname, router]);

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out");
    router.replace("/");
  };

  // প্রথম `/me` কলটা শেষ না হওয়া পর্যন্ত কিছুই দেখাই না — নাহলে
  // এক মুহূর্তের জন্য লগইন পেজ ঝিলিক দিয়ে যায়
  if (loading || !isLoggedIn) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={26} className="animate-spin text-brand" />
      </div>
    );
  }

  const displayName = user?.name?.trim() || "Guest";
  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?";

  return (
    <section className="bg-canvas py-8 sm:py-10">
      <div className="max-width">
        {/* ---------- হেডার কার্ড ---------- */}
        <div className="site-card flex flex-wrap items-center gap-4 px-5 py-5 sm:px-7">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-soft text-[17px] font-extrabold text-brand-dark">
            {user?.image?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image.url}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-[22px] font-bold text-ink sm:text-[26px]">
              {user?.name?.trim() || "Welcome!"}
            </h1>
            <p className="mt-0.5 text-[13px] text-ink-soft">{user?.phone}</p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="site-btn site-btn-outline h-10 px-4 text-[13px]"
          >
            <LogOut size={15} /> Log out
          </button>
        </div>

        {/* ---------- ট্যাব ---------- */}
        <nav className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`inline-flex flex-shrink-0 items-center gap-2 rounded-pill border px-4 py-2.5 text-[13px] font-bold transition-colors ${
                  active
                    ? "border-brand bg-brand text-ink-invert"
                    : "border-border bg-surface text-ink-soft hover:border-brand hover:text-brand"
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-5">{children}</div>
      </div>
    </section>
  );
}
