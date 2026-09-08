/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Archive,
  Inbox,
  Mail,
  MailOpen,
  Phone,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";

import { AuthContext } from "@/src/app/dashboard/AuthProvider";
import DeleteModal from "@/src/app/Layout/DeleteModal/DeleteModal";
import { DateTimeBd } from "@/src/app/Layout/utils/DateTimeBd";
import {
  CONTACT_TOPIC_LABEL,
  type ContactStatus,
  type ContactTopic,
} from "@/src/interfaces/contactMessage.interface";

/* ==========================================================================
   CONTACT INBOX — GET /api/v1/contact
   --------------------------------------------------------------------------
   সাইটের /contact ফর্ম থেকে আসা বার্তা এখানে জমা হয়। কোনো ইমেইল সেটআপ
   লাগে না — বার্তা সরাসরি ডাটাবেসে যায়, তাই কিছু হারায় না।

   তিনটে অবস্থা: new → read → archived। কার্ড খুললেই সেটা নিজে থেকে
   "read" হয়ে যায়, তাই আলাদা করে চিহ্ন দেওয়ার কাজ মনে রাখতে হয় না।
   ========================================================================== */

interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  phone: string;
  topic: ContactTopic;
  subject: string;
  message: string;
  status: ContactStatus;
  handled_by?: string;
  createdAt: string;
}

interface Meta {
  page: number;
  limit: number;
  total: number;
  totalPage: number;
  /** সার্ভার এখানে "কতগুলো এখনো পড়া হয়নি" পাঠায় */
  totalAmount?: number;
}

const PAGE_SIZE = 12;

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "new", label: "New" },
  { value: "read", label: "Read" },
  { value: "archived", label: "Archived" },
  { value: "", label: "All" },
];

/** ব্যাজের রঙ — বিষয় দেখেই বোঝা যায় কোনটা আগে ধরতে হবে */
const TOPIC_TONE: Record<ContactTopic, string> = {
  general: "var(--color-info)",
  reservation: "var(--color-herb)",
  catering: "var(--color-saffron)",
  feedback: "var(--accent-primary)",
  complaint: "var(--color-chili)",
};

export default function ContactInbox() {
  const { token } = useContext(AuthContext);

  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchDraft, setSearchDraft] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState<string>("new");
  const [page, setPage] = useState(1);

  const [openId, setOpenId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* ---------------- তালিকা ---------------- */
  const fetchMessages = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        limit: PAGE_SIZE,
        sortBy: "createdAt",
        sortOrder: "desc",
      };
      // খালি ফিল্টার পাঠালে সার্ভারে `field: ""` হয়ে সব ফলাফল হারিয়ে যায়
      if (searchTerm) params.searchTerm = searchTerm;
      if (status) params.status = status;

      const res = await axios.get("/api/v1/contact", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setMessages(res.data.data || []);
      setMeta(res.data.meta || null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [token, page, searchTerm, status]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  /* ---------------- সার্চ ডিবাউন্স ---------------- */
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchTerm((prev) =>
        prev === searchDraft.trim() ? prev : searchDraft.trim(),
      );
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchDraft]);

  /* ---------------- অবস্থা বদল ---------------- */
  const changeStatus = async (id: string, next: ContactStatus) => {
    try {
      await axios.patch(
        `/api/v1/contact/${id}`,
        { status: next },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setMessages((prev) =>
        // "new" ট্যাবে থাকলে পড়া বার্তাটা তালিকা থেকে সরেই যাক
        status && next !== status
          ? prev.filter((m) => m._id !== id)
          : prev.map((m) => (m._id === id ? { ...m, status: next } : m)),
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not update");
    }
  };

  /** কার্ড খোলা মানেই বার্তাটা পড়া হয়েছে */
  const toggleOpen = (message: ContactMessage) => {
    const opening = openId !== message._id;
    setOpenId(opening ? message._id : null);

    if (opening && message.status === "new") {
      changeStatus(message._id, "read");
    }
  };

  const resetFilters = () => {
    setSearchDraft("");
    setSearchTerm("");
    setStatus("");
    setPage(1);
  };

  const handleDeleted = () => {
    if (deleteId) setMessages((prev) => prev.filter((m) => m._id !== deleteId));
    setDeleteId(null);
    if (messages.length === 1 && page > 1) setPage((p) => p - 1);
    else fetchMessages();
  };

  const totalPage = meta?.totalPage ?? 1;
  const unread = meta?.totalAmount ?? 0;
  const hasFilters = !!searchTerm || status !== "";

  return (
    <div className="admin-panel bg-app text-primary min-h-screen p-4 md:p-6">
      {deleteId && (
        <DeleteModal
          deleteUrl={`/api/v1/contact/${deleteId}`}
          title="Message"
          onDeleted={handleDeleted}
          closeModal={() => setDeleteId(null)}
        />
      )}

      {/* ================= হেডার ================= */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-primary text-[20px] font-semibold">
            Contact messages
          </h1>
          <p className="text-secondary mt-0.5 text-[13px]">
            {unread > 0
              ? `${unread} unread message${unread === 1 ? "" : "s"} from the website`
              : "Everything sent through the contact form lands here"}
          </p>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="btn btn-outline flex items-center gap-2 px-4 py-2 text-[13px]"
          >
            <RotateCcw size={14} />
            Clear filters
          </button>
        )}
      </div>

      {/* ================= ফিল্টার ================= */}
      <div className="admin-card mb-5 flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search
            size={15}
            className="text-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
          />
          <input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Search by name, email, phone or message"
            className="input-field w-full py-2 pr-3 pl-9 text-[13px]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value || "all"}
              type="button"
              onClick={() => {
                setStatus(tab.value);
                setPage(1);
              }}
              className={`btn px-3 py-1.5 text-[12px] ${
                status === tab.value ? "btn-primary" : "btn-outline"
              }`}
            >
              {tab.label}
              {tab.value === "new" && unread > 0 && ` (${unread})`}
            </button>
          ))}
        </div>
      </div>

      {/* ================= তালিকা ================= */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="admin-skeleton h-24 rounded-xl" />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="admin-card flex flex-col items-center gap-2 p-10 text-center">
          <Inbox size={28} className="text-muted" />
          <p className="text-primary text-[15px] font-medium">
            {hasFilters ? "Nothing matches these filters" : "No messages yet"}
          </p>
          <p className="text-secondary text-[13px]">
            Guests can write to you from the Contact page on the website.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((message) => {
            const open = openId === message._id;

            return (
              <div key={message._id} className="admin-card p-4">
                {/* ---------- সারি ---------- */}
                <button
                  type="button"
                  onClick={() => toggleOpen(message)}
                  className="flex w-full flex-wrap items-start gap-3 text-left"
                >
                  <span
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ background: "var(--accent-blue-soft)" }}
                  >
                    {message.status === "new" ? (
                      <Mail size={17} className="text-accent" />
                    ) : (
                      <MailOpen size={17} className="text-muted" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-primary text-[14px] ${
                          message.status === "new" ? "font-semibold" : "font-medium"
                        }`}
                      >
                        {message.name}
                      </span>

                      <span
                        className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                        style={{
                          background: "var(--bg-elevated)",
                          color: TOPIC_TONE[message.topic],
                        }}
                      >
                        {CONTACT_TOPIC_LABEL[message.topic]}
                      </span>

                      {message.status === "archived" && (
                        <span className="text-muted text-[10.5px]">Archived</span>
                      )}
                    </div>

                    <p className="text-secondary mt-1 line-clamp-1 text-[13px]">
                      {message.subject || message.message}
                    </p>
                  </div>

                  <span className="text-muted flex-shrink-0 text-[11.5px]">
                    {DateTimeBd(message.createdAt)}
                  </span>
                </button>

                {/* ---------- খোলা অবস্থা ---------- */}
                {open && (
                  <div className="border-default-t mt-3 pt-3">
                    <p className="text-primary text-[13.5px] leading-relaxed whitespace-pre-line">
                      {message.message}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {/* উত্তর দেওয়ার সবচেয়ে সোজা পথ — মেইল ক্লায়েন্টেই
                          বিষয় বসিয়ে খুলে যায় */}
                      <a
                        href={`mailto:${message.email}?subject=${encodeURIComponent(
                          `Re: ${message.subject || CONTACT_TOPIC_LABEL[message.topic]}`,
                        )}`}
                        className="btn btn-primary flex items-center gap-1.5 px-4 py-2 text-[13px]"
                      >
                        <Mail size={14} />
                        Reply by email
                      </a>

                      {message.phone && (
                        <a
                          href={`tel:${message.phone.replace(/[^\d+]/g, "")}`}
                          className="btn btn-outline flex items-center gap-1.5 px-4 py-2 text-[13px]"
                        >
                          <Phone size={14} />
                          {message.phone}
                        </a>
                      )}

                      {message.status !== "archived" && (
                        <button
                          type="button"
                          onClick={() => changeStatus(message._id, "archived")}
                          className="btn btn-outline flex items-center gap-1.5 px-4 py-2 text-[13px]"
                        >
                          <Archive size={14} />
                          Archive
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setDeleteId(message._id)}
                        className="btn btn-ghost ml-auto flex items-center gap-1.5 px-3 py-2 text-[13px]"
                        style={{ color: "var(--color-chili)" }}
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>

                    <p className="text-muted mt-3 text-[11.5px]">
                      {message.email}
                      {message.handled_by ? ` · handled by ${message.handled_by}` : ""}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ================= পেজিনেশন ================= */}
      {totalPage > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="btn btn-outline px-4 py-2 text-[13px] disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-secondary text-[13px]">
            Page {page} of {totalPage}
          </span>
          <button
            type="button"
            disabled={page >= totalPage}
            onClick={() => setPage((p) => p + 1)}
            className="btn btn-outline px-4 py-2 text-[13px] disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
