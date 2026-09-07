/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import { AuthContext } from "@/src/app/dashboard/AuthProvider";
import { useSettingsStore } from "@/src/store/settings.store";
import { calcOrderPricing, formatMoney } from "@/src/config/business";
import { can, MANAGEMENT } from "@/src/app/dashboard/roles";
import {
  buildInvoiceHtml,
  buildKitchenTicketHtml,
  printHtml,
  type InvoiceOrder,
} from "../Invoice/invoiceHtml";

/* ==========================================================================
   POS — কাউন্টারে বসে অর্ডার তোলা
   --------------------------------------------------------------------------
   ওয়েটার হাতে লিখে আনা অর্ডারটা ম্যানেজার এখানে তোলে: খাবারে ট্যাপ করে
   কার্টে যোগ, টেবিল বাছাই, তারপর একবারে বিল + রান্নাঘরের টিকিট ছাপা।

   একটা চলতি অর্ডার খুললে (?order=…) সেটাতেই নতুন পদ যোগ করা যায় — টেবিলে
   বসে আবার অর্ডার দিলে আলাদা বিল বানাতে হয় না।
   ========================================================================== */

interface Variation {
  _id: string;
  name?: string;
  regularPrice?: number;
  salePrice?: number;
  status?: string;
  isOpen?: boolean;
  images?: { url?: string }[];
}

interface Food {
  _id: string;
  name: string;
  image?: string;
  category_id?: string;
  category_name?: string;
  status?: string;
  variations?: Variation[];
}

interface Category {
  _id: string;
  name: string;
  status?: string;
  sort_order?: number;
}

interface TableRow {
  _id: string;
  name: string;
  capacity: number;
  zone?: string;
  status: string;
  waiter_id?: string;
  waiter_name?: string;
  current_order?: { _id: string; order_number: string } | null;
}

interface Staff {
  _id: string;
  staff_name: string;
  staff_role: string;
  status: string;
}

interface CartLine {
  key: string;
  food_id: string;
  variation_id: string;
  name: string;
  variation_name: string;
  unit_price: number;
  quantity: number;
  note?: string;
}

type OrderType = "dine_in" | "delivery" | "pickup";

const lineKey = (foodId: string, variationId: string) =>
  `${foodId}::${variationId}`;

/** ডিফল্ট ভ্যারিয়েশন — না থাকলে প্রথম চালু থাকা একটা */
const pickVariation = (food: Food): Variation | undefined => {
  const list = (food.variations || []).filter(
    (v) => v.status !== "inactive" && v.isOpen !== false,
  );
  return list[0];
};

const priceOf = (v?: Variation) =>
  Number(v?.salePrice ?? v?.regularPrice ?? 0);

export default function PosScreen() {
  const { token, adminData } = useContext(AuthContext);
  const settings = useSettingsStore((s) => s.settings);
  const canDiscount = can(adminData?.role, MANAGEMENT);
  const router = useRouter();
  const params = useSearchParams();

  const authHeader = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token],
  );

  /* ---------------- মেনু ---------------- */
  const [foods, setFoods] = useState<Food[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeCategory, setActiveCategory] = useState("");
  const [search, setSearch] = useState("");

  /* ---------------- কার্ট ---------------- */
  const [lines, setLines] = useState<CartLine[]>([]);
  const [orderType, setOrderType] = useState<OrderType>("dine_in");
  const [tableId, setTableId] = useState("");
  const [waiterId, setWaiterId] = useState("");
  const [guests, setGuests] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cod");

  const [customerName, setCustomerName] = useState("Walk-in guest");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [orderNote, setOrderNote] = useState("");

  const [submitting, setSubmitting] = useState(false);

  /** চলতি অর্ডারে যোগ করার মোড — ?order=<id> দিয়ে খোলা হয় */
  const openOrderId = params.get("order");
  const [openOrder, setOpenOrder] = useState<InvoiceOrder & { _id: string } | null>(
    null,
  );

  /* ---------------- ডেটা লোড ---------------- */
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      try {
        const [foodRes, catRes, tableRes, staffRes] = await Promise.all([
          axios.get("/api/v1/foods", {
            headers: authHeader,
            params: { limit: 300, status: "active" },
          }),
          axios.get("/api/v1/categories", { headers: authHeader }),
          axios.get("/api/v1/tables?view=floor", { headers: authHeader }),
          axios.get("/api/v1/staffs", { headers: authHeader }),
        ]);
        if (cancelled) return;
        setFoods(foodRes.data.data || []);
        setCategories(catRes.data.data || []);
        setTables(tableRes.data.data || []);
        setStaff(staffRes.data.data || []);
      } catch (err: any) {
        if (!cancelled) {
          toast.error(err?.response?.data?.message || "Could not load the menu");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, authHeader]);

  /* ---------------- চলতি অর্ডার / টেবিল প্রি-সিলেক্ট ---------------- */
  const loadOpenOrder = useCallback(async () => {
    if (!token || !openOrderId) {
      setOpenOrder(null);
      return;
    }
    try {
      const res = await axios.get(`/api/v1/orders/${openOrderId}`, {
        headers: authHeader,
      });
      const order = res.data.data;
      setOpenOrder(order);
      setOrderType(order.order_type);
      setTableId(order.table_id ? String(order.table_id) : "");
      setWaiterId(order.waiter?.id || "");
      setGuests(order.guests || 0);
      setCustomerName(order.customer?.name || "Walk-in guest");
      setCustomerPhone(order.customer?.phone || "");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not open that order");
    }
  }, [token, openOrderId, authHeader]);

  useEffect(() => {
    loadOpenOrder();
  }, [loadOpenOrder]);

  // ফ্লোর ম্যাপ থেকে ?table=… নিয়ে এলে টেবিলটা আগেই বাছা থাকে
  useEffect(() => {
    const preset = params.get("table");
    if (preset && !openOrderId) {
      setTableId(preset);
      setOrderType("dine_in");
    }
  }, [params, openOrderId]);

  // টেবিল বাছলে সেই টেবিলের ওয়েটারই ধরে নিই
  useEffect(() => {
    if (!tableId || waiterId) return;
    const table = tables.find((t) => t._id === tableId);
    if (table?.waiter_id) setWaiterId(table.waiter_id);
  }, [tableId, tables, waiterId]);

  /* ---------------- মেনু ছাঁকা ---------------- */
  const visibleFoods = useMemo(() => {
    const term = search.trim().toLowerCase();
    return foods.filter((f) => {
      if (f.status === "inactive") return false;
      if (activeCategory && String(f.category_id) !== activeCategory) return false;
      if (term && !f.name.toLowerCase().includes(term)) return false;
      return (f.variations || []).length > 0;
    });
  }, [foods, activeCategory, search]);

  const waiters = staff.filter(
    (s) =>
      s.status === "active" &&
      ["waiter", "manager", "cashier"].includes(s.staff_role),
  );

  const freeTables = tables.filter(
    (t) => !t.current_order || t._id === tableId,
  );

  /* ---------------- কার্টের কাজ ---------------- */
  const addFood = (food: Food, variation?: Variation) => {
    const v = variation ?? pickVariation(food);
    if (!v) {
      toast.error(`${food.name} has no available size`);
      return;
    }

    const key = lineKey(food._id, v._id);
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) =>
          l.key === key ? { ...l, quantity: Math.min(50, l.quantity + 1) } : l,
        );
      }
      return [
        ...prev,
        {
          key,
          food_id: food._id,
          variation_id: v._id,
          name: food.name,
          variation_name: v.name || "",
          unit_price: priceOf(v),
          quantity: 1,
        },
      ];
    });
  };

  const setQty = (key: string, quantity: number) =>
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.key !== key)
        : prev.map((l) =>
            l.key === key ? { ...l, quantity: Math.min(50, quantity) } : l,
          ),
    );

  const setLineNote = (key: string, note: string) =>
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, note: note.slice(0, 200) } : l)),
    );

  const resetCart = () => {
    setLines([]);
    setDiscount(0);
    setOrderNote("");
    setGuests(0);
  };

  /* ---------------- দাম ---------------- */
  const subtotal = lines.reduce((sum, l) => sum + l.unit_price * l.quantity, 0);
  const pricing = calcOrderPricing(
    { subtotal, orderType, discount: canDiscount ? discount : 0 },
    settings,
  );

  const belowMinimum =
    orderType === "delivery" && subtotal < settings.min_order_amount;

  /* ---------------- ছাপা ---------------- */
  const printBoth = async (order: InvoiceOrder & { _id: string }) => {
    printHtml(buildKitchenTicketHtml(order, settings));
    // দুটো প্রিন্ট একসাথে দিলে ব্রাউজার একটাই দেখায় — একটু ফাঁক দরকার
    setTimeout(() => printHtml(buildInvoiceHtml(order, settings)), 700);

    try {
      await axios.post(`/api/v1/orders/${order._id}/invoice`, {}, {
        headers: authHeader,
      });
    } catch {
      // ছাপা হয়েই গেছে — গোনা না হলেও কাজ আটকাবে না
    }
  };

  /* ---------------- অর্ডার পাঠানো ---------------- */
  const placeOrder = async (alsoConfirm: boolean) => {
    if (!lines.length) {
      toast.error("Add at least one item");
      return;
    }
    if (orderType === "dine_in" && !tableId) {
      toast.error("Pick a table for a dine-in order");
      return;
    }
    if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(customerPhone.trim())) {
      toast.error("A valid mobile number is needed on the bill");
      return;
    }

    setSubmitting(true);
    try {
      const items = lines.map((l) => ({
        food_id: l.food_id,
        variation_id: l.variation_id,
        quantity: l.quantity,
        note: l.note || undefined,
      }));

      /* ---- চলতি অর্ডারে যোগ ---- */
      if (openOrder) {
        const res = await axios.post(
          `/api/v1/orders/${openOrder._id}/items`,
          { items },
          { headers: authHeader },
        );
        toast.success(res.data.message);
        const updated = res.data.data;
        resetCart();
        setOpenOrder(updated);
        // নতুন পদগুলো রান্নাঘরে যেতে হবে
        printHtml(buildKitchenTicketHtml(updated, settings));
        return;
      }

      /* ---- নতুন অর্ডার ---- */
      const res = await axios.post(
        "/api/v1/orders/pos",
        {
          items,
          customer: {
            name: customerName.trim() || "Walk-in guest",
            phone: customerPhone.trim(),
            address: customerAddress.trim() || undefined,
            note: orderNote.trim() || undefined,
          },
          order_type: orderType,
          table_id: orderType === "dine_in" ? tableId : undefined,
          guests: guests || undefined,
          waiter_id: waiterId || undefined,
          discount: canDiscount ? discount : 0,
          payment_method: paymentMethod,
        },
        { headers: authHeader },
      );

      let order = res.data.data;
      toast.success(`${order.order_number} created`);

      // ম্যানেজার চাইলে সাথে সাথেই কনফার্ম — তখনই রান্নাঘরে চলে যায়
      if (alsoConfirm) {
        try {
          const confirmRes = await axios.patch(
            `/api/v1/orders/${order._id}/status`,
            { status: "confirmed" },
            { headers: authHeader },
          );
          order = confirmRes.data.data;
        } catch (err: any) {
          toast.error(
            err?.response?.data?.message || "Order saved but could not confirm it",
          );
        }
      }

      await printBoth(order);
      resetCart();
      setCustomerPhone("");
      setCustomerAddress("");
      // টেবিল এখন দখলে — ফ্লোর ম্যাপ নতুন করে আনি
      const tableRes = await axios.get("/api/v1/tables?view=floor", {
        headers: authHeader,
      });
      setTables(tableRes.data.data || []);
      setTableId("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not save the order");
    } finally {
      setSubmitting(false);
    }
  };

  /* ==========================================================================
     রেন্ডার
     ========================================================================== */
  return (
    <div className="admin-panel bg-app text-primary flex h-[calc(100vh-4rem)] flex-col lg:flex-row lg:gap-4 lg:p-2">
      {/* ================= বাঁ পাশ — মেনু ================= */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* সার্চ + ক্যাটাগরি */}
        <div className="bg-card border-default mb-3 rounded-xl p-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the menu…"
            className="input-field h-11 w-full px-3.5 text-[14px]"
          />

          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setActiveCategory("")}
              className={`role-pill flex-shrink-0 px-3.5 py-1.5 text-[12.5px] font-medium ${
                !activeCategory ? "active-admin" : ""
              }`}
            >
              All
            </button>
            {categories
              .filter((c) => c.status !== "inactive")
              .map((c) => (
                <button
                  key={c._id}
                  type="button"
                  onClick={() => setActiveCategory(c._id)}
                  className={`role-pill flex-shrink-0 px-3.5 py-1.5 text-[12.5px] font-medium ${
                    activeCategory === c._id ? "active-admin" : ""
                  }`}
                >
                  {c.name}
                </button>
              ))}
          </div>
        </div>

        {/* খাবারের গ্রিড */}
        <div className="min-h-0 flex-1 overflow-y-auto pb-3">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="admin-skeleton h-32 rounded-xl" />
              ))}
            </div>
          ) : !visibleFoods.length ? (
            <div className="bg-card border-default rounded-xl px-6 py-16 text-center">
              <p className="text-primary text-[15px] font-medium">
                No dishes here
              </p>
              <p className="text-secondary mt-1 text-[13px]">
                Try another category, or add items under Menu Management.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {visibleFoods.map((food) => {
                const v = pickVariation(food);
                const hasChoices = (food.variations || []).length > 1;
                const image = v?.images?.[0]?.url || food.image;

                return (
                  <div
                    key={food._id}
                    className="bg-card border-default admin-card-hover overflow-hidden rounded-xl"
                  >
                    <button
                      type="button"
                      onClick={() => addFood(food)}
                      className="block w-full text-left"
                    >
                      <div
                        className="h-20 w-full overflow-hidden"
                        style={{ background: "var(--accent-blue-soft)" }}
                      >
                        {image ? (
                          <img
                            src={image}
                            alt={food.name}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="p-2.5">
                        <p className="text-primary line-clamp-2 text-[13px] font-medium">
                          {food.name}
                        </p>
                        <p className="text-highlight mt-1 text-[13px] font-semibold">
                          {formatMoney(priceOf(v))}
                        </p>
                      </div>
                    </button>

                    {/* একাধিক সাইজ থাকলে সবগুলোই এক ট্যাপে */}
                    {hasChoices && (
                      <div className="border-default-t flex flex-wrap gap-1 px-2.5 py-2">
                        {(food.variations || [])
                          .filter(
                            (x) => x.status !== "inactive" && x.isOpen !== false,
                          )
                          .map((x) => (
                            <button
                              key={x._id}
                              type="button"
                              onClick={() => addFood(food, x)}
                              className="btn btn-ghost px-2 py-1 text-[11px]"
                            >
                              {x.name || "Regular"}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ================= ডান পাশ — কার্ট ================= */}
      <aside className="bg-card border-default flex max-h-full w-full flex-col overflow-hidden rounded-xl lg:w-[380px]">
        {/* চলতি অর্ডারে যোগ করার মোড */}
        {openOrder && (
          <div
            className="border-default-b px-4 py-3"
            style={{ background: "var(--accent-orange-soft)" }}
          >
            <p className="text-primary text-[13.5px] font-medium">
              Adding to {openOrder.order_number}
            </p>
            <p className="text-secondary mt-0.5 text-[12px]">
              {openOrder.table_name || "No table"} · already{" "}
              {formatMoney(openOrder.pricing?.total || 0)}
            </p>
            <button
              type="button"
              onClick={() => {
                resetCart();
                router.push("/dashboard/pos");
              }}
              className="btn btn-ghost mt-2 px-3 py-1 text-[12px]"
            >
              Start a fresh order instead
            </button>
          </div>
        )}

        {/* অর্ডারের ধরন + টেবিল */}
        {!openOrder && (
          <div className="border-default-b space-y-3 px-4 py-3">
            <div className="flex gap-2">
              {(["dine_in", "delivery", "pickup"] as OrderType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setOrderType(t)}
                  className={`role-pill flex-1 px-3 py-1.5 text-[12.5px] font-medium ${
                    orderType === t ? "active-admin" : ""
                  }`}
                >
                  {t === "dine_in" ? "Dine in" : t === "delivery" ? "Delivery" : "Pickup"}
                </button>
              ))}
            </div>

            {orderType === "dine_in" && (
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={tableId}
                  onChange={(e) => setTableId(e.target.value)}
                  className="input-field h-9 w-full px-2.5 text-[13px]"
                >
                  <option value="">Pick a table</option>
                  {freeTables.map((t) => (
                    <option
                      key={t._id}
                      value={t._id}
                      className="bg-elevated text-primary"
                    >
                      {t.name} ({t.capacity})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={guests || ""}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  placeholder="Guests"
                  className="input-field h-9 w-full px-2.5 text-[13px]"
                />
              </div>
            )}

            <select
              value={waiterId}
              onChange={(e) => setWaiterId(e.target.value)}
              className="input-field h-9 w-full px-2.5 text-[13px]"
            >
              <option value="">No waiter assigned</option>
              {waiters.map((w) => (
                <option
                  key={w._id}
                  value={w._id}
                  className="bg-elevated text-primary"
                >
                  {w.staff_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* কার্টের লাইন */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {!lines.length ? (
            <div className="px-5 py-12 text-center">
              <p className="text-primary text-[14px] font-medium">
                Nothing added yet
              </p>
              <p className="text-secondary mt-1 text-[12.5px]">
                Tap a dish on the left to start the order.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border-color)]">
              {lines.map((line) => (
                <li key={line.key} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-primary text-[13.5px] font-medium">
                        {line.name}
                      </p>
                      {line.variation_name && (
                        <p className="text-secondary text-[11.5px]">
                          {line.variation_name}
                        </p>
                      )}
                    </div>
                    <span className="text-primary text-[13.5px] font-semibold tabular-nums">
                      {formatMoney(line.unit_price * line.quantity)}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQty(line.key, line.quantity - 1)}
                      className="btn btn-outline h-7 w-7 p-0 text-[14px]"
                    >
                      −
                    </button>
                    <span className="text-primary w-7 text-center text-[13.5px] font-semibold">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty(line.key, line.quantity + 1)}
                      className="btn btn-outline h-7 w-7 p-0 text-[14px]"
                    >
                      +
                    </button>

                    <input
                      value={line.note || ""}
                      onChange={(e) => setLineNote(line.key, e.target.value)}
                      placeholder="Note for the kitchen"
                      className="input-field ml-1 h-7 min-w-0 flex-1 px-2 text-[12px]"
                    />

                    <button
                      type="button"
                      onClick={() => setQty(line.key, 0)}
                      className="btn btn-ghost text-danger px-2 py-1 text-[12px]"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* কাস্টমার + টাকা */}
        <div className="border-default-t px-4 py-3">
          {!openOrder && (
            <div className="mb-3 grid grid-cols-2 gap-2">
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer name"
                className="input-field h-9 w-full px-2.5 text-[13px]"
              />
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="01712345678"
                inputMode="numeric"
                className="input-field h-9 w-full px-2.5 text-[13px]"
              />
              {orderType === "delivery" && (
                <input
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Delivery address"
                  className="input-field col-span-2 h-9 w-full px-2.5 text-[13px]"
                />
              )}
            </div>
          )}

          <dl className="space-y-1.5 text-[13px]">
            <Row label="Subtotal" value={formatMoney(pricing.subtotal)} />

            {canDiscount && !openOrder && (
              <div className="flex items-center justify-between">
                <dt className="text-secondary">Discount</dt>
                <dd>
                  <input
                    type="number"
                    min={0}
                    value={discount || ""}
                    onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="input-field h-7 w-24 px-2 text-right text-[13px]"
                  />
                </dd>
              </div>
            )}

            {pricing.service_charge > 0 && (
              <Row
                label={`Service (${pricing.service_charge_percent}%)`}
                value={formatMoney(pricing.service_charge)}
              />
            )}
            {pricing.vat > 0 && (
              <Row
                label={`VAT (${pricing.vat_percent}%${
                  pricing.tax_mode === "inclusive" ? " incl." : ""
                })`}
                value={formatMoney(pricing.vat)}
              />
            )}
            {pricing.delivery_fee > 0 && (
              <Row label="Delivery" value={formatMoney(pricing.delivery_fee)} />
            )}
          </dl>

          <div className="border-default-t mt-2.5 flex items-baseline justify-between pt-2.5">
            <span className="text-primary text-[14px] font-medium">
              {openOrder ? "New items" : "Total"}
            </span>
            <span className="text-primary text-[22px] font-semibold tabular-nums">
              {formatMoney(pricing.total)}
            </span>
          </div>

          {belowMinimum && (
            <p className="text-danger mt-2 text-[12px]">
              Minimum delivery order is {formatMoney(settings.min_order_amount)}.
            </p>
          )}

          {!openOrder && (
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="input-field mt-3 h-9 w-full px-2.5 text-[13px]"
            >
              <option value="cod">Cash</option>
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="card">Card</option>
            </select>
          )}

          <div className="mt-3 flex gap-2">
            {openOrder ? (
              <button
                type="button"
                onClick={() => placeOrder(false)}
                disabled={submitting || !lines.length}
                className="btn btn-primary flex-1 px-4 py-2.5 text-[14px]"
              >
                {submitting ? "Adding…" : "Add to bill & print ticket"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => placeOrder(true)}
                  disabled={submitting || !lines.length || belowMinimum}
                  className="btn btn-primary flex-1 px-4 py-2.5 text-[14px]"
                >
                  {submitting ? "Saving…" : "Confirm & print"}
                </button>
                <button
                  type="button"
                  onClick={() => placeOrder(false)}
                  disabled={submitting || !lines.length || belowMinimum}
                  className="btn btn-outline px-3 py-2.5 text-[13px]"
                  title="Save without sending it to the kitchen yet"
                >
                  Hold
                </button>
              </>
            )}
          </div>

          {lines.length > 0 && (
            <button
              type="button"
              onClick={resetCart}
              className="btn btn-ghost mt-2 w-full px-4 py-1.5 text-[12.5px]"
            >
              Clear
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-secondary">{label}</dt>
      <dd className="text-primary font-medium tabular-nums">{value}</dd>
    </div>
  );
}
