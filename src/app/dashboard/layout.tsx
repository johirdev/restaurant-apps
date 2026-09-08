/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./admin.css";
import AuthProvider, { AuthContext } from "./AuthProvider";
import LoginAdmin from "../components/DashBoard/Admins/LoginAdmin/LoginAdmin";
import Navbar from "../Layout/Admin/Navbar/Navbar";
import Sidebar from "../Layout/Admin/Sidebar/Sidebar";
import { useSettingsStore } from "@/src/store/settings.store";
import {
  can,
  landingFor,
  COUNTER,
  ORDERS_VIEW,
  KITCHEN_ROLES,
  MANAGEMENT,
  OWNERS,
  type DashboardRole,
} from "./roles";

export default function AdminClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleMenuToggle = () => setIsOpen((p) => !p);
  const handleClose = () => setIsOpen(false);

  return (
    <AuthProvider>
      <AdminInner
        isOpen={isOpen}
        handleMenuToggle={handleMenuToggle}
        handleClose={handleClose}
      >
        {children}
      </AdminInner>
    </AuthProvider>
  );
}

/* ==========================================================================
   কোন পথে কে ঢুকতে পারবে
   --------------------------------------------------------------------------
   সাইডবার এমনিতেই অনুমতি নেই এমন লিংক দেখায় না, কিন্তু কেউ সরাসরি URL
   লিখে ঢুকতে চাইলে এখানেই আটকায়। আসল পাহারা সার্ভারে (requireAuth.ts) —
   এটা শুধু ভুল পাতায় গিয়ে খালি স্ক্রিন দেখা ঠেকায়।
   ========================================================================== */
const ROUTE_ROLES: { prefix: string; roles: DashboardRole[] }[] = [
  { prefix: "/dashboard/kitchen", roles: KITCHEN_ROLES },
  { prefix: "/dashboard/pos", roles: COUNTER },
  { prefix: "/dashboard/tables", roles: COUNTER },
  { prefix: "/dashboard/orders", roles: ORDERS_VIEW },
  { prefix: "/dashboard/reports/kitchen", roles: KITCHEN_ROLES },
  { prefix: "/dashboard/reports", roles: MANAGEMENT },
  { prefix: "/dashboard/menu", roles: MANAGEMENT },
  { prefix: "/dashboard/customers", roles: MANAGEMENT },
  { prefix: "/dashboard/settings", roles: MANAGEMENT },
  { prefix: "/dashboard/admins/staff", roles: MANAGEMENT },
  { prefix: "/dashboard/admins", roles: OWNERS },
  { prefix: "/dashboard/banners", roles: MANAGEMENT },
  { prefix: "/dashboard/reviews", roles: OWNERS },
];

/** সবচেয়ে নির্দিষ্ট প্রিফিক্সটাই জেতে — /dashboard/admins/staff বনাম /dashboard/admins */
function rolesForPath(pathname: string): DashboardRole[] | null {
  const match = ROUTE_ROLES.filter((r) => pathname.startsWith(r.prefix)).sort(
    (a, b) => b.prefix.length - a.prefix.length,
  )[0];
  return match?.roles ?? null;
}

function AdminInner({ children, isOpen, handleMenuToggle, handleClose }: any) {
  const { token, adminData } = useContext(AuthContext);
  const pathname = usePathname();
  const router = useRouter();
  const loadSettings = useSettingsStore((s) => s.load);

  // ভ্যাট/সার্ভিস চার্জ/টাকার চিহ্ন — POS আর ইনভয়েসে দরকার, তাই একবারেই আনি
  useEffect(() => {
    if (token) loadSettings();
  }, [token, loadSettings]);

  const role = adminData?.role;
  const allowed = rolesForPath(pathname ?? "");
  const blocked = !!token && !!allowed && !can(role, allowed);

  // অনুমতি না থাকলে যে যার নিজের শুরুর পাতায় ফিরে যাক
  useEffect(() => {
    if (blocked) router.replace(landingFor(role));
  }, [blocked, role, router]);

  if (!token) return <LoginAdmin />;

  return (
    <div className="admin-panel bg-app text-primary flex h-screen flex-col overflow-hidden">
      {/* Top Navbar */}
      <Navbar onMenuToggle={handleMenuToggle} />

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (FULL HEIGHT FIXED) */}
        <div className="h-full">
          <Sidebar isOpen={isOpen} onClose={handleClose} />
        </div>

        {/* Main Content (ONLY SCROLL AREA) */}
        <main className="flex-1 h-full p-4 pt-3 overflow-y-auto">
          {blocked ? (
            <div className="bg-card border-default mx-auto mt-10 max-w-md rounded-xl px-6 py-12 text-center">
              <h2 className="text-primary text-[16px] font-medium">
                This screen is not part of your job
              </h2>
              <p className="text-secondary mt-2 text-[13px]">
                Ask a manager if you think you should have access to it.
              </p>
              <Link
                href={landingFor(role)}
                className="btn btn-primary mt-5 inline-flex px-5 py-2 text-[13px]"
              >
                Go to my screen
              </Link>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="light"
      />
    </div>
  );
}
