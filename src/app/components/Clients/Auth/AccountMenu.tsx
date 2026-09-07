"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  LogIn,
  LogOut,
  ReceiptText,
  User,
  UserPlus,
  UtensilsCrossed,
} from "lucide-react";
import { useUser } from "./UserProvider";

/* ==========================================================================
   নেভবারের অ্যাকাউন্ট মেনু
   --------------------------------------------------------------------------
   লগইন না থাকলে: লগইন / অ্যাকাউন্ট খুলুন।
   লগইন থাকলে: প্রোফাইল, অর্ডার, খাবার, লগআউট।
   ========================================================================== */

const LINKS = [
  { href: "/account", label: "My profile", icon: User },
  { href: "/account/orders", label: "My orders", icon: ReceiptText },
  { href: "/account/dishes", label: "Dishes I ordered", icon: UtensilsCrossed },
];

export default function AccountMenu({
  /** মোবাইল মেনুতে ড্রপডাউন নয়, সোজা লিংকের তালিকা দেখাই */
  variant = "desktop",
  onNavigate,
}: {
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  const { user, loading, isLoggedIn, logout } = useUser();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // বাইরে ক্লিক করলে বা Esc চাপলে মেনু বন্ধ
  useEffect(() => {
    if (!open) return;

    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);

    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    onNavigate?.();
    await logout();
    toast.success("Logged out");
    router.push("/");
  };

  // লগইনের পর যেখান থেকে এসেছিল সেখানেই ফেরত যাক
  const loginHref =
    pathname && pathname !== "/"
      ? `/login?next=${encodeURIComponent(pathname)}`
      : "/login";

  const initials =
    (user?.name?.trim() || user?.phone || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?";

  /* ================= মোবাইল — সমতল তালিকা ================= */
  if (variant === "mobile") {
    if (loading) {
      return <span className="skeleton block h-5 w-24 rounded-pill" />;
    }

    if (!isLoggedIn) {
      return (
        <div className="flex items-center gap-4">
          <Link
            href={loginHref}
            onClick={onNavigate}
            className="flex items-center gap-2 text-[13px] font-bold text-ink"
          >
            <LogIn size={15} /> Log in
          </Link>
          <Link
            href="/registration"
            onClick={onNavigate}
            className="flex items-center gap-2 text-[13px] font-medium text-ink-soft"
          >
            <UserPlus size={15} /> Sign up
          </Link>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className="flex items-center gap-2 text-[13px] font-medium text-ink-soft"
          >
            <Icon size={15} /> {label}
          </Link>
        ))}
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 text-[13px] font-medium text-chili"
        >
          <LogOut size={15} /> Log out
        </button>
      </div>
    );
  }

  /* ================= ডেস্কটপ — ড্রপডাউন ================= */
  if (loading) {
    return <span className="skeleton hidden h-8 w-8 rounded-full sm:block" />;
  }

  if (!isLoggedIn) {
    return (
      <Link
        href={loginHref}
        aria-label="Log in"
        className="hidden items-center gap-1.5 text-[13px] font-bold text-ink transition-colors hover:text-brand sm:flex"
      >
        <LogIn size={17} />
        <span className="hidden md:inline">Log in</span>
      </Link>
    );
  }

  return (
    <div ref={boxRef} className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-brand-soft text-[12px] font-extrabold text-brand-dark transition-transform hover:scale-105"
      >
        {user?.image?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image.url}
            alt={user.name || "Your account"}
            className="h-full w-full object-cover"
          />
        ) : (
          initials
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="pop-in absolute right-0 top-[calc(100%+10px)] z-50 w-60 overflow-hidden rounded-md border border-border bg-surface shadow-[var(--shadow-float)]"
        >
          <div className="border-b border-border bg-canvas px-4 py-3">
            <p className="truncate text-[13.5px] font-bold text-ink">
              {user?.name?.trim() || "Your account"}
            </p>
            <p className="mt-0.5 text-[12px] text-ink-soft">{user?.phone}</p>
          </div>

          <div className="py-1.5">
            {LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-semibold text-ink-soft transition-colors hover:bg-surface-soft hover:text-brand"
              >
                <Icon size={15} /> {label}
              </Link>
            ))}
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 border-t border-border px-4 py-3 text-[13.5px] font-semibold text-chili transition-colors hover:bg-chili-soft"
          >
            <LogOut size={15} /> Log out
          </button>
        </div>
      )}
    </div>
  );
}
