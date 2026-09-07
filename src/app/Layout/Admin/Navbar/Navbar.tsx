"use client";

import { useState, useRef, useEffect, useContext } from "react";
import Icons from "../../utils/icons";
import { AuthContext } from "@/src/app/dashboard/AuthProvider";


/**
 * Navbar.tsx
 * -------------------------------------------------------------
 * Top navbar for the Restaurant Admin Dashboard.
 * - Icons come from the shared ./icons.tsx (react-icons + lucide-react)
 * - Fully responsive: hamburger + collapsible search on mobile,
 *   full search bar + profile name/role on desktop
 * - Dropdowns (notifications / profile) are width-capped so they
 *   never overflow the viewport on small screens
 */

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

// Replace with real data from your API/store
const notifications: Notification[] = [];

interface NavbarProps {
  onMenuToggle: () => void;
  pageTitle?: string;
}

export default function Navbar({
  onMenuToggle,
  pageTitle = "Dashboard",
}: NavbarProps) {
  const { adminData, logOut } = useContext(AuthContext);

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between gap-2 px-3 sm:px-6 h-16"
      style={{
        background:
          "linear-gradient(180deg, var(--color-admin-sidebar) 0%, var(--color-admin-bg) 60%, var(--color-admin-bg) 100%)",
        borderBottom: "1px solid rgba(99,102,241,0.15)",
      }}
    >
      {/* Left — hamburger + title */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <button
          aria-label="Toggle menu"
          onClick={onMenuToggle}
          className="lg:hidden flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <Icons.Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1
            className="text-white font-semibold text-base sm:text-lg leading-none truncate"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Admin <span className="text-[var(--color-info)]">Panel</span>
          </h1>
          <p className="hidden sm:block text-gray-500 text-xs mt-1 truncate">
            {pageTitle}
          </p>
        </div>
      </div>

    

      {/* Right — search toggle (mobile) + notifications + profile */}
      <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
        {/* Search toggle — mobile only */}
        <button
          aria-label="Search"
          onClick={() => setMobileSearchOpen((p) => !p)}
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 hover:text-white transition-all"
          style={{
            background: mobileSearchOpen
              ? "rgba(99,102,241,0.15)"
              : "rgba(255,255,255,0.05)",
            border: "1px solid rgba(99,102,241,0.15)",
          }}
        >
          <Icons.Search className="w-4 h-4" />
        </button>

        {/* Notification Bell */}
        <div ref={notifRef} className="relative">
          <button
            aria-label="Notifications"
            onClick={() => {
              setNotifOpen((p) => !p);
              setProfileOpen(false);
            }}
            className="relative flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 hover:text-white transition-all"
            style={{
              background: notifOpen
                ? "rgba(99,102,241,0.15)"
                : "rgba(255,255,255,0.05)",
              border: "1px solid rgba(99,102,241,0.15)",
            }}
          >
            <Icons.Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold"
                style={{
                  background: "var(--accent-primary)",
                  fontSize: "9px",
                  boxShadow: "0 0 8px rgba(99,102,241,0.6)",
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {notifOpen && (
            <div
              className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-16 sm:top-12 sm:w-80 max-w-[calc(100vw-1rem)] rounded-2xl overflow-hidden z-50"
              style={{
                background: "var(--color-admin-bg)",
                border: "1px solid rgba(99,102,241,0.2)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              }}
            >
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid rgba(99,102,241,0.15)" }}
              >
                <p
                  className="text-white font-semibold text-sm"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  Notifications
                </p>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    background: "rgba(99,102,241,0.2)",
                    color: "var(--accent-primary)",
                  }}
                >
                  {unreadCount} new
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-gray-500">
                    No notifications yet
                  </p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className="px-4 py-3 hover:bg-white/5 transition-colors"
                    >
                      <p className="text-white text-sm font-medium">
                        {n.title}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {n.message}
                      </p>
                      <p className="text-gray-600 text-[11px] mt-1">{n.time}</p>
                    </div>
                  ))
                )}
              </div>

              <div
                className="px-4 py-3 text-center"
                style={{ borderTop: "1px solid rgba(99,102,241,0.15)" }}
              >
                <button
                  className="text-sm font-medium transition-colors"
                  style={{
                    color: "var(--accent-primary)",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  View all notifications →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div
          className="w-px h-6 hidden sm:block"
          style={{ background: "rgba(255,255,255,0.1)" }}
        />

        {/* Profile */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => {
              setProfileOpen((p) => !p);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2 px-1.5 sm:px-3 py-1.5 rounded-xl transition-all"
            style={{
              background: profileOpen ? "rgba(99,102,241,0.15)" : "transparent",
              border: "1px solid transparent",
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, var(--accent-primary), var(--accent-primary-hover))",
                boxShadow: "0 0 12px rgba(99,102,241,0.4)",
              }}
            >
              {adminData?.name?.slice(0, 1)?.toUpperCase() || "AD"}
            </div>
            <div className="hidden sm:block text-left min-w-0">
              <p
                className="text-white text-sm font-medium leading-none truncate max-w-[9rem]"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {adminData?.name}
              </p>
              <p className="text-gray-500 text-xs mt-0.5 truncate max-w-[9rem]">
                {adminData?.role}
              </p>
            </div>
            <span className="text-gray-500 hidden sm:block">
              <Icons.ChevronDown className="w-4 h-4" />
            </span>
          </button>

          {/* Profile Dropdown */}
          {profileOpen && (
            <div
              className="absolute right-0 top-12 w-52 max-w-[calc(100vw-1rem)] rounded-2xl overflow-hidden z-50"
              style={{
                background: "var(--color-admin-bg)",
                border: "1px solid rgba(99,102,241,0.2)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              }}
            >
              <div
                className="px-4 py-3"
                style={{ borderBottom: "1px solid rgba(99,102,241,0.15)" }}
              >
                <p
                  className="text-white text-sm font-medium truncate"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {adminData?.role}
                </p>
                <p className="text-gray-500 text-xs mt-0.5 truncate">
                  {adminData?.email}
                </p>
              </div>
              <div className="p-2 space-y-0.5">
                <button
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-left"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <span className="text-indigo-400">
                    <Icons.Settings className="w-4 h-4" />
                  </span>
                  Settings
                </button>
                <button
                  onClick={() => logOut()}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <Icons.LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile search bar — slides below header */}
      {mobileSearchOpen && (
        <div
          className="md:hidden absolute left-0 right-0 top-16 px-3 py-3"
          style={{
            background: "var(--color-admin-bg)",
            borderBottom: "1px solid rgba(99,102,241,0.15)",
            boxShadow: "0 12px 24px rgba(0,0,0,0.35)",
          }}
        >
          <div
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(99,102,241,0.15)",
            }}
          >
            <Icons.Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Search orders, items, customers..."
              className="w-full bg-transparent text-sm text-white placeholder-gray-500 outline-none"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            />
          </div>
        </div>
      )}
    </header>
  );
}
