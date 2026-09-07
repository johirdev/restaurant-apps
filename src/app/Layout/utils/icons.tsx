"use client";

/**
 * icons.tsx
 * -------------------------------------------------------------
 * Centralized, reusable icon map for the Restaurant Admin Dashboard.
 * Uses:
 *   - react-icons  (Fi = Feather, Md = Material)
 *   - lucide-react
 *
 * Import icons from here anywhere in the app instead of importing
 * directly from "react-icons" / "lucide-react" everywhere, so that
 * swapping an icon later only needs one change.
 *
 * Usage:
 *   import { Icons } from "@/components/icons";
 *   <Icons.Dashboard className="w-5 h-5" />
 */

import {
  FiGrid,
  FiTag,
  FiStar,
  FiVideo,
  FiFileText,
  FiUserPlus,
  FiUsers,
  FiChevronDown,
  FiChevronRight,
  FiMenu,
  FiX,
  FiShoppingBag,
  FiSearch,
} from "react-icons/fi";

import {
  MdOutlineRestaurantMenu,
  MdOutlineCategory,
  MdOutlineTableRestaurant,
  MdOutlinePointOfSale,
  MdOutlineReceiptLong,
  MdOutlinePayments,
  MdOutlineLocalOffer,
  MdOutlineDeliveryDining,
  MdOutlineRateReview,
  MdOutlineInventory2,
  MdOutlineAnalytics,
  MdOutlineSettings,
  MdOutlineNotificationsActive,
  MdOutlineStorefront,
} from "react-icons/md";

import {
  LayoutDashboard,
  ClipboardList,
  CheckCircle2,
  Truck,
  XCircle,
  CookingPot,
  ChefHat,
  Users2,
  ShieldCheck,
  CalendarClock,
  CalendarCheck2,
  Percent,
  Wallet,
  BadgeDollarSign,
  Star,
  MessageSquareText,
  Image as ImageIcon,
  Boxes,
  Building2,
  Bell,
  Plus,
  LogOut,
} from "lucide-react";

/**
 * A plain type for icon component props so every icon here
 * (react-icons OR lucide-react) can be used interchangeably
 * with a consistent className API.
 */
export type IconProps = {
  className?: string;
};

export const Icons = {
  // ---- Core / Layout ----
  Dashboard: (p: IconProps) => <LayoutDashboard className={p.className} />,
  Menu: (p: IconProps) => <FiMenu className={p.className} />,
  Close: (p: IconProps) => <FiX className={p.className} />,
  ChevronDown: (p: IconProps) => <FiChevronDown className={p.className} />,
  ChevronRight: (p: IconProps) => <FiChevronRight className={p.className} />,
  Plus: (p: IconProps) => <Plus className={p.className} />,
  Bell: (p: IconProps) => <Bell className={p.className} />,
  Search: (p: IconProps) => <FiSearch className={p.className} />,
  LogOut: (p: IconProps) => <LogOut className={p.className} />,
  Store: (p: IconProps) => <MdOutlineStorefront className={p.className} />,
  Building: (p: IconProps) => <Building2 className={p.className} />,

  // ---- Menu / Product Management ----
  MenuManagement: (p: IconProps) => (
    <MdOutlineRestaurantMenu className={p.className} />
  ),
  Category: (p: IconProps) => <MdOutlineCategory className={p.className} />,
  FoodItem: (p: IconProps) => <CookingPot className={p.className} />,
  Inventory: (p: IconProps) => <MdOutlineInventory2 className={p.className} />,
  Boxes: (p: IconProps) => <Boxes className={p.className} />,

  // ---- Orders / POS ----
  Orders: (p: IconProps) => <ClipboardList className={p.className} />,
  OnlineOrders: (p: IconProps) => <FiShoppingBag className={p.className} />,
  POS: (p: IconProps) => <MdOutlinePointOfSale className={p.className} />,
  ConfirmOrders: (p: IconProps) => <CheckCircle2 className={p.className} />,
  DeliveryOrders: (p: IconProps) => (
    <MdOutlineDeliveryDining className={p.className} />
  ),
  CancelOrders: (p: IconProps) => <XCircle className={p.className} />,
  Truck: (p: IconProps) => <Truck className={p.className} />,

  // ---- Kitchen & Tables ----
  Chef: (p: IconProps) => <ChefHat className={p.className} />,
  Table: (p: IconProps) => (
    <MdOutlineTableRestaurant className={p.className} />
  ),

  // ---- Table Booking / Reservation ----
  TableBooking: (p: IconProps) => (
    <MdOutlineTableRestaurant className={p.className} />
  ),
  Reservation: (p: IconProps) => <CalendarClock className={p.className} />,
  ReservationConfirmed: (p: IconProps) => (
    <CalendarCheck2 className={p.className} />
  ),

  // ---- Invoice / Payment ----
  Invoice: (p: IconProps) => <MdOutlineReceiptLong className={p.className} />,
  Payment: (p: IconProps) => <MdOutlinePayments className={p.className} />,
  Wallet: (p: IconProps) => <Wallet className={p.className} />,
  Revenue: (p: IconProps) => <BadgeDollarSign className={p.className} />,
  Coupon: (p: IconProps) => <MdOutlineLocalOffer className={p.className} />,
  Discount: (p: IconProps) => <Percent className={p.className} />,

  // ---- Reviews / Content ----
  Review: (p: IconProps) => <MdOutlineRateReview className={p.className} />,
  Star: (p: IconProps) => <Star className={p.className} />,
  Feedback: (p: IconProps) => <MessageSquareText className={p.className} />,
  Portfolio: (p: IconProps) => <ImageIcon className={p.className} />,
  Blog: (p: IconProps) => <FiFileText className={p.className} />,
  Pricing: (p: IconProps) => <FiTag className={p.className} />,

  // ---- Analytics / Settings ----
  Analytics: (p: IconProps) => <MdOutlineAnalytics className={p.className} />,
  Settings: (p: IconProps) => <MdOutlineSettings className={p.className} />,
  Notification: (p: IconProps) => (
    <MdOutlineNotificationsActive className={p.className} />
  ),

  // ---- Users / Admin / Staff ----
  UserPlus: (p: IconProps) => <FiUserPlus className={p.className} />,
  Users: (p: IconProps) => <FiUsers className={p.className} />,
  Staff: (p: IconProps) => <Users2 className={p.className} />,
  Admin: (p: IconProps) => <ShieldCheck className={p.className} />,

  // ---- Misc (kept from original set for compatibility) ----
  Grid: (p: IconProps) => <FiGrid className={p.className} />,
  Video: (p: IconProps) => <FiVideo className={p.className} />,
  CheckCircle: (p: IconProps) => <CheckCircle2 className={p.className} />,
  XCircleAlt: (p: IconProps) => <XCircle className={p.className} />,
};

export default Icons;
