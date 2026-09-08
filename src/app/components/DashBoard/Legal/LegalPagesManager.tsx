"use client";

/**
 * LegalPagesManager — Privacy / Terms / Refund তিনটে পাতার সম্পাদক
 * --------------------------------------------------------------------------
 * বাঁয়ে লেখা, ডানে সাইটের হুবহু প্রিভিউ। প্রিভিউটা আসল <LegalPageView />
 * দিয়েই আঁকা, তাই এখানে যেমন দেখাচ্ছে সাইটেও ঠিক তেমনই যাবে।
 *
 *   GET    /api/v1/legal        → তিনটে পাতা একসাথে
 *   PATCH  /api/v1/legal/:slug  → সেভ
 *   DELETE /api/v1/legal/:slug  → শুরুর খসড়ায় ফেরা (শুধু superadmin)
 *
 * ভাষা: উপরের সুইচটা শুধু কোন ভাষার ঘরগুলো এখন সম্পাদনা হচ্ছে সেটা ঠিক
 * করে — দুই ভাষার লেখাই একসাথে সেভ হয়, একটা লিখলে অন্যটা মুছে যায় না।
 *
 * সাজ: প্রতিটা সেকশনের নিজের ফন্ট সাইজ, রঙ, ফাঁক আছে; ফাঁকা রাখলে পাতার
 * থিম থেকে মান আসে। ফলে ম্যানেজারকে প্রতিটা সেকশনে সব কিছু বসাতে হয় না —
 * যেটুকু আলাদা করতে চান, শুধু সেটুকু।
 */

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

import { AuthContext } from "@/src/app/dashboard/AuthProvider";
import { getApiErrorMessage } from "@/src/lib/apiClient";
import { htmlToText } from "@/src/lib/sanitizeHtml";
import LegalPageView from "@/src/app/components/Clients/Legal/LegalPageView";
import RichTextEditor from "./RichTextEditor";
import {
  LEGAL_PAGE_LABEL,
  LEGAL_PAGE_PATH,
  LEGAL_SLUGS,
  SECTION_ICONS,
  type ILegalBlockStyle,
  type ILegalPage,
  type ILegalSection,
  type ILegalTheme,
  type LegalLang,
  type LegalSlug,
} from "@/src/interfaces/legal.interface";

import "./legalEditor.css";

/* ------------------------------------------------------------------ */
/* ফর্মের ছোট ঘরগুলো — মডিউল স্তরে, নাহলে প্রতিটা কি-স্ট্রোকে ফোকাস হারায় */
/* ------------------------------------------------------------------ */

const TextField = ({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
}) => (
  <div className="legal-admin__field">
    <label>{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="input-field h-9 w-full px-3 text-[13px]"
    />
    {hint ? <span className="text-[10.5px] text-muted">{hint}</span> : null}
  </div>
);

const SelectField = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) => (
  <div className="legal-admin__field">
    <label>{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input-field h-9 w-full px-2 text-[13px]"
    >
      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
          className="bg-elevated text-primary"
        >
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

/**
 * রঙের ঘর — পাশাপাশি একটা সোয়াচ আর একটা লেখার বাক্স।
 * লেখার বাক্সটা দরকার, কারণ `var(--color-brand)` লিখতে পারাটাই বেশি
 * কাজে দেয় — তাতে সাইটের ব্র্যান্ড রঙ বদলালে পাতাও সাথে বদলায়।
 */
const ColorField = ({
  label,
  value,
  onChange,
  placeholder = "auto",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) => (
  <div className="legal-admin__field">
    <label>{label}</label>
    <div className="legal-admin__color">
      <input
        type="color"
        value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#d70f64"}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`${label} colour picker`}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field h-9 px-3 text-[13px]"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          title="Use the page default"
          className="text-[11px] text-muted hover:text-primary"
        >
          ✕
        </button>
      ) : null}
    </div>
  </div>
);

const ToggleField = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <label className="legal-admin__toggle">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
    {label}
  </label>
);

/* ------------------------------------------------------------------ */
/* ছোট হাতিয়ার                                                        */
/* ------------------------------------------------------------------ */

/** `<input type="date">` এর ভাষা — "2026-09-08" */
const toDateInput = (value?: string | Date) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

/** শিরোনাম থেকে অ্যাংকর — "How we use it" → "how-we-use-it" */
const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);

const ICON_OPTIONS = SECTION_ICONS.map((icon) => ({
  value: icon,
  label: icon.charAt(0).toUpperCase() + icon.slice(1),
}));

const ALIGN_OPTIONS = [
  { value: "", label: "Default" },
  { value: "left", label: "Left" },
  { value: "center", label: "Centre" },
  { value: "right", label: "Right" },
  { value: "justify", label: "Justified" },
];

const FONT_OPTIONS = [
  { value: "sans", label: "Site font" },
  { value: "bengali", label: "Bengali (Hind Siliguri)" },
  { value: "serif", label: "Serif" },
];

/* ------------------------------------------------------------------ */

const LegalPagesManager = () => {
  const { token, adminData } = useContext(AuthContext);
  const authHeader = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token],
  );

  const isOwner = adminData?.role === "superadmin";

  const [pages, setPages] = useState<Record<string, ILegalPage>>({});
  const [slug, setSlug] = useState<LegalSlug>("privacy");
  const [lang, setLang] = useState<LegalLang>("en");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [openSection, setOpenSection] = useState<number | null>(0);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const page = pages[slug];

  /* ---------------------------------------------------------------- LOAD */
  useEffect(() => {
    const fetchPages = async () => {
      try {
        const res = await axios.get("/api/v1/legal", authHeader);
        const list: ILegalPage[] = res.data?.data ?? [];
        const next: Record<string, ILegalPage> = {};
        list.forEach((item) => {
          next[item.slug] = item;
        });
        setPages(next);
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Failed to load the legal pages"));
      } finally {
        setLoading(false);
      }
    };

    fetchPages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------------------- না-সেভ করা লেখা হারানো ঠেকানো */
  useEffect(() => {
    if (!dirty) return;

    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /* --------------------------------------------------- প্রিভিউ (দেরি করে) */
  // প্রতিটা কি-স্ট্রোকে পুরো পাতাটা আবার আঁকলে টাইপ করতে গিয়ে আটকে যেত,
  // তাই প্রিভিউ ৪০০ মিলিসেকেন্ড পিছিয়ে চলে।
  const [preview, setPreview] = useState<ILegalPage | null>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!page) return;

    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => setPreview(page), 400);

    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
  }, [page]);

  /* ------------------------------------------------------------- HELPERS */
  const patchPage = (changes: Partial<ILegalPage>) => {
    setPages((prev) => ({ ...prev, [slug]: { ...prev[slug], ...changes } }));
    setDirty(true);
  };

  /** দুই ভাষার একটা ঘরে শুধু চলতি ভাষারটা বদলায় */
  const patchLocalized = (
    field: "title" | "subtitle" | "intro",
    value: string,
  ) => {
    const current = page[field] || { en: "", bn: "" };
    patchPage({ [field]: { ...current, [lang]: value } } as Partial<ILegalPage>);
  };

  const patchSection = (index: number, changes: Partial<ILegalSection>) => {
    const sections = [...(page.sections || [])];
    sections[index] = { ...sections[index], ...changes };
    patchPage({ sections });
  };

  const patchSectionStyle = (
    index: number,
    key: string,
    value: string | boolean,
  ) => {
    const section = page.sections[index];
    // কী-টা রানটাইমে ঠিক হয়, তাই TypeScript কে বলে দিতে হয় ফলটা কী আকারের
    patchSection(index, {
      style: { ...(section.style || {}), [key]: value } as ILegalBlockStyle,
    });
  };

  const patchTheme = (key: string, value: string | boolean) => {
    patchPage({
      theme: { ...(page.theme || {}), [key]: value } as ILegalTheme,
    });
  };

  /* ------------------------------------------------------ সেকশনের কাজ */
  const addSection = () => {
    const sections = [...(page.sections || [])];
    sections.push({
      // অ্যাংকরটা এখনই ইউনিক করে রাখি — শিরোনাম লেখা হলে নিচে বদলে যাবে
      key: `section-${Date.now().toString(36)}`,
      icon: "file",
      heading: { en: "", bn: "" },
      body: { en: "", bn: "" },
      style: {},
      status: "active",
    });
    patchPage({ sections });
    setOpenSection(sections.length - 1);
  };

  const duplicateSection = (index: number) => {
    const sections = [...(page.sections || [])];
    const copy: ILegalSection = {
      ...sections[index],
      key: `${sections[index].key}-copy-${Date.now().toString(36).slice(-4)}`,
      heading: { ...sections[index].heading },
      body: { ...sections[index].body },
      style: { ...(sections[index].style || {}) },
    };
    sections.splice(index + 1, 0, copy);
    patchPage({ sections });
    setOpenSection(index + 1);
  };

  const removeSection = (index: number) => {
    const sections = [...(page.sections || [])];
    sections.splice(index, 1);
    patchPage({ sections });
    setOpenSection(null);
    setConfirmDelete(null);
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    const sections = [...(page.sections || [])];
    if (target < 0 || target >= sections.length) return;

    [sections[index], sections[target]] = [sections[target], sections[index]];
    patchPage({ sections });
    setOpenSection(target);
  };

  /* ---------------------------------------------------------------- SAVE */
  const handleSave = async () => {
    if (!page) return;

    // অ্যাংকর দুবার থাকলে সূচিপত্রের লিংক ভুল জায়গায় নিয়ে যায় —
    // সার্ভারও এটা আটকায়, তবে এখানে ধরলে মেসেজটা আরও কাজের হয়
    const keys = (page.sections || []).map((section) => section.key);
    const duplicate = keys.find((key, index) => keys.indexOf(key) !== index);
    if (duplicate) {
      toast.error(`Two sections share the anchor "${duplicate}"`);
      return;
    }

    const blank = (page.sections || []).findIndex((section) => !section.key.trim());
    if (blank >= 0) {
      toast.error(`Section ${blank + 1} needs an anchor id`);
      setOpenSection(blank);
      return;
    }

    setSaving(true);
    try {
      const res = await axios.patch(
        `/api/v1/legal/${slug}`,
        {
          title: page.title,
          subtitle: page.subtitle,
          intro: page.intro,
          sections: page.sections,
          effective_date: page.effective_date,
          contact: page.contact,
          seo: page.seo,
          theme: page.theme,
          default_lang: page.default_lang,
          status: page.status,
        },
        authHeader,
      );

      // সার্ভার HTML ছেঁকে ফেরত দেয় — সেই ছাঁকা লেখাটাই এখন থেকে আসল,
      // নাহলে এডিটরে এমন কিছু থেকে যেত যা সাইটে কখনো দেখা যেত না
      if (res.data?.data) {
        setPages((prev) => ({ ...prev, [slug]: res.data.data }));
      }
      setDirty(false);
      toast.success("Page saved successfully!");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save the page"));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      const res = await axios.delete(`/api/v1/legal/${slug}`, authHeader);
      if (res.data?.data) {
        setPages((prev) => ({ ...prev, [slug]: res.data.data }));
      }
      setDirty(false);
      setConfirmReset(false);
      setOpenSection(0);
      toast.success("Page reset to the starting draft");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to reset the page"));
    } finally {
      setSaving(false);
    }
  };

  /* ---------------------------------------------------------------- VIEW */
  if (loading) {
    return (
      <div className="admin-panel bg-app text-primary min-h-screen p-6">
        <p className="text-sm text-secondary">Loading the legal pages…</p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="admin-panel bg-app text-primary min-h-screen p-6">
        <p className="text-sm text-secondary">
          Could not load the pages. Refresh and try again.
        </p>
      </div>
    );
  }

  const sections = page.sections || [];
  const activeCount = sections.filter((s) => s.status !== "hidden").length;

  return (
    <div className="admin-panel bg-app text-primary min-h-screen p-4 md:p-6">
      {/* ========================= TOP BAR ========================= */}
      <div className="bg-card border-default mb-5 rounded-xl p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="legal-admin__tabs">
            {LEGAL_SLUGS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setSlug(item);
                  setOpenSection(0);
                  setConfirmDelete(null);
                  setConfirmReset(false);
                }}
                className={`legal-admin__tab${slug === item ? " is-active" : ""}`}
              >
                {LEGAL_PAGE_LABEL[item].en}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {dirty ? (
              <span className="text-[12px] font-medium text-danger">
                Unsaved changes
              </span>
            ) : null}

            <a
              href={LEGAL_PAGE_PATH[slug]}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline px-4 py-2 text-[12.5px]"
            >
              Open live page
            </a>

            <button
              type="button"
              onClick={() => setShowPreview((open) => !open)}
              className="btn btn-outline px-4 py-2 text-[12.5px] xl:hidden"
            >
              {showPreview ? "Hide preview" : "Preview"}
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary px-6 py-2 text-[12.5px]"
            >
              {saving ? "Saving…" : "Save page"}
            </button>
          </div>
        </div>

        {/* ---- ভাষা, স্ট্যাটাস, তারিখ ---- */}
        <div className="border-default-t mt-4 flex flex-wrap items-end gap-4 pt-4">
          <div className="legal-admin__field">
            <label>Editing language</label>
            <div className="legal-admin__lang">
              <button
                type="button"
                onClick={() => setLang("en")}
                className={lang === "en" ? "is-active" : undefined}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLang("bn")}
                className={lang === "bn" ? "is-active" : undefined}
              >
                বাংলা
              </button>
            </div>
          </div>

          <SelectField
            label="Visitors see first"
            value={page.default_lang || "en"}
            onChange={(value) =>
              patchPage({ default_lang: value as LegalLang })
            }
            options={[
              { value: "en", label: "English" },
              { value: "bn", label: "বাংলা" },
            ]}
          />

          <SelectField
            label="Status"
            value={page.status}
            onChange={(value) =>
              patchPage({ status: value as ILegalPage["status"] })
            }
            options={[
              { value: "published", label: "Published — live on the site" },
              { value: "draft", label: "Draft — site shows 404" },
            ]}
          />

          <div className="legal-admin__field">
            <label>Effective from</label>
            <input
              type="date"
              value={toDateInput(page.effective_date)}
              onChange={(e) =>
                patchPage({
                  effective_date: e.target.value
                    ? new Date(e.target.value)
                    : undefined,
                })
              }
              className="input-field h-9 px-3 text-[13px]"
            />
          </div>

          <p className="ml-auto text-[12px] text-secondary">
            {activeCount} of {sections.length} sections shown
          </p>
        </div>
      </div>

      {/* ========================= MAIN GRID ========================= */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_480px]">
        {/* ============== LEFT: EDITOR ============== */}
        <div className="space-y-5">
          {/* ---------- হেডার ---------- */}
          <div className="bg-card border-default rounded-xl p-5">
            <h2 className="mb-4 text-[15px] font-medium text-primary">
              Page header
              <span className="ml-2 text-[12px] text-muted">
                ({lang === "en" ? "English" : "বাংলা"})
              </span>
            </h2>

            <div className="space-y-4">
              <TextField
                label="Title"
                value={page.title?.[lang] || ""}
                onChange={(value) => patchLocalized("title", value)}
                placeholder={LEGAL_PAGE_LABEL[slug][lang]}
              />

              <TextField
                label="One-line summary"
                value={page.subtitle?.[lang] || ""}
                onChange={(value) => patchLocalized("subtitle", value)}
                placeholder="Shown under the title in the hero"
              />

              <div className="legal-admin__field">
                <label>Opening paragraph</label>
                <RichTextEditor
                  key={`intro-${slug}-${lang}`}
                  value={page.intro?.[lang] || ""}
                  onChange={(html) => patchLocalized("intro", html)}
                  placeholder="A short welcome before the sections start…"
                  minHeight={140}
                />
              </div>
            </div>
          </div>

          {/* ---------- সেকশন ---------- */}
          <div className="bg-card border-default rounded-xl p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[15px] font-medium text-primary">
                Sections
                <span className="ml-2 text-[12px] text-muted">
                  ({sections.length})
                </span>
              </h2>
              <button
                type="button"
                onClick={addSection}
                className="btn btn-blue px-4 py-1.5 text-[12px]"
              >
                + Add section
              </button>
            </div>

            {sections.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-secondary">
                No sections yet. Add the first one.
              </p>
            ) : null}

            <div className="space-y-2.5">
              {sections.map((section, index) => {
                const isOpen = openSection === index;
                const heading =
                  section.heading?.[lang] ||
                  section.heading?.[lang === "en" ? "bn" : "en"] ||
                  "Untitled section";
                const style = section.style || {};

                return (
                  <div
                    key={index}
                    className={`legal-admin__section${isOpen ? " is-open" : ""}${
                      section.status === "hidden" ? " is-hidden" : ""
                    }`}
                  >
                    {/* ---- মাথা ---- */}
                    <div className="flex items-center gap-2 pr-3">
                      <div className="legal-admin__drag pl-3">
                        <button
                          type="button"
                          title="Move up"
                          disabled={index === 0}
                          onClick={() => moveSection(index, -1)}
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          title="Move down"
                          disabled={index === sections.length - 1}
                          onClick={() => moveSection(index, 1)}
                        >
                          ▼
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setOpenSection(isOpen ? null : index)}
                        className="legal-admin__section-head flex-1"
                      >
                        <span className="text-[12px] font-semibold text-muted">
                          {index + 1}.
                        </span>
                        <span className="flex-1 truncate text-[13.5px] font-medium text-primary">
                          {heading}
                        </span>
                        <span className="hidden text-[11px] text-muted sm:inline">
                          {htmlToText(section.body?.[lang] || "", 44) || "empty"}
                        </span>
                      </button>

                      <button
                        type="button"
                        title={
                          section.status === "hidden"
                            ? "Show on the site"
                            : "Hide from the site"
                        }
                        onClick={() =>
                          patchSection(index, {
                            status:
                              section.status === "hidden" ? "active" : "hidden",
                          })
                        }
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                          section.status === "hidden"
                            ? "text-danger"
                            : "text-success"
                        }`}
                        style={{
                          borderColor: "var(--border-color)",
                          background:
                            section.status === "hidden"
                              ? "var(--accent-red-soft)"
                              : "var(--accent-green-soft)",
                        }}
                      >
                        {section.status === "hidden" ? "Hidden" : "Shown"}
                      </button>
                    </div>

                    {/* ---- শরীর ---- */}
                    {isOpen ? (
                      <div className="legal-admin__section-body">
                        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_170px_150px]">
                          <TextField
                            label={`Heading (${lang === "en" ? "English" : "বাংলা"})`}
                            value={section.heading?.[lang] || ""}
                            onChange={(value) => {
                              const heading = {
                                ...(section.heading || { en: "", bn: "" }),
                                [lang]: value,
                              };
                              // অ্যাংকরটা এখনো নিজে থেকে বসানো থাকলে
                              // ইংরেজি শিরোনামের সাথে মিলিয়ে দিই
                              const autoKey =
                                lang === "en" &&
                                /^section-[a-z0-9]+$/.test(section.key) &&
                                slugify(value);

                              patchSection(index, {
                                heading,
                                ...(autoKey ? { key: autoKey } : {}),
                              });
                            }}
                          />

                          <SelectField
                            label="Icon"
                            value={section.icon || "file"}
                            onChange={(value) =>
                              patchSection(index, {
                                icon: value as ILegalSection["icon"],
                              })
                            }
                            options={ICON_OPTIONS}
                          />

                          <TextField
                            label="Anchor id"
                            value={section.key}
                            onChange={(value) =>
                              patchSection(index, { key: slugify(value) })
                            }
                            hint="Used by the link in the contents list"
                          />
                        </div>

                        <div className="legal-admin__field mt-4">
                          <label>
                            Text ({lang === "en" ? "English" : "বাংলা"})
                          </label>
                          <RichTextEditor
                            key={`body-${slug}-${lang}-${index}`}
                            value={section.body?.[lang] || ""}
                            onChange={(html) => {
                              const body = {
                                ...(section.body || { en: "", bn: "" }),
                                [lang]: html,
                              };
                              patchSection(index, { body });
                            }}
                            placeholder="Write this section…"
                            minHeight={200}
                          />
                        </div>

                        {/* ---- এই সেকশনের নিজের সাজ ---- */}
                        <details className="mt-4">
                          <summary className="cursor-pointer text-[12.5px] font-medium text-highlight">
                            Styling for this section
                          </summary>

                          <div className="legal-admin__style">
                            <TextField
                              label="Heading size"
                              value={style.heading_size || ""}
                              onChange={(value) =>
                                patchSectionStyle(index, "heading_size", value)
                              }
                              placeholder="24px"
                            />
                            <ColorField
                              label="Heading colour"
                              value={style.heading_color || ""}
                              onChange={(value) =>
                                patchSectionStyle(index, "heading_color", value)
                              }
                            />
                            <TextField
                              label="Heading weight"
                              value={style.heading_weight || ""}
                              onChange={(value) =>
                                patchSectionStyle(index, "heading_weight", value)
                              }
                              placeholder="700"
                            />

                            <TextField
                              label="Text size"
                              value={style.body_size || ""}
                              onChange={(value) =>
                                patchSectionStyle(index, "body_size", value)
                              }
                              placeholder="16px"
                            />
                            <ColorField
                              label="Text colour"
                              value={style.body_color || ""}
                              onChange={(value) =>
                                patchSectionStyle(index, "body_color", value)
                              }
                            />
                            <TextField
                              label="Line height"
                              value={style.line_height || ""}
                              onChange={(value) =>
                                patchSectionStyle(index, "line_height", value)
                              }
                              placeholder="1.85"
                            />
                            <TextField
                              label="Letter spacing"
                              value={style.letter_spacing || ""}
                              onChange={(value) =>
                                patchSectionStyle(index, "letter_spacing", value)
                              }
                              placeholder="normal"
                            />

                            <SelectField
                              label="Alignment"
                              value={style.align || ""}
                              onChange={(value) =>
                                patchSectionStyle(index, "align", value)
                              }
                              options={ALIGN_OPTIONS}
                            />

                            <TextField
                              label="Space above"
                              value={style.space_above || ""}
                              onChange={(value) =>
                                patchSectionStyle(index, "space_above", value)
                              }
                              placeholder="44px"
                            />
                            <TextField
                              label="Space below"
                              value={style.space_below || ""}
                              onChange={(value) =>
                                patchSectionStyle(index, "space_below", value)
                              }
                              placeholder="0"
                            />

                            <ColorField
                              label="Background"
                              value={style.background || ""}
                              onChange={(value) =>
                                patchSectionStyle(index, "background", value)
                              }
                              placeholder="transparent"
                            />
                            <ColorField
                              label="Accent bar"
                              value={style.accent || ""}
                              onChange={(value) =>
                                patchSectionStyle(index, "accent", value)
                              }
                            />

                            <div className="legal-admin__field">
                              <label>Extras</label>
                              <ToggleField
                                label="Box it in a card"
                                checked={!!style.card}
                                onChange={(checked) =>
                                  patchSectionStyle(index, "card", checked)
                                }
                              />
                              <ToggleField
                                label="Line underneath"
                                checked={!!style.divider}
                                onChange={(checked) =>
                                  patchSectionStyle(index, "divider", checked)
                                }
                              />
                            </div>
                          </div>
                        </details>

                        {/* ---- সেকশনের বোতাম ---- */}
                        <div className="border-default-t mt-4 flex flex-wrap items-center gap-2 pt-3">
                          <button
                            type="button"
                            onClick={() => duplicateSection(index)}
                            className="btn btn-outline px-4 py-1.5 text-[11.5px]"
                          >
                            Duplicate
                          </button>

                          {confirmDelete === index ? (
                            <>
                              <span className="text-[11.5px] text-danger">
                                Delete this section?
                              </span>
                              <button
                                type="button"
                                onClick={() => removeSection(index)}
                                className="btn btn-danger px-4 py-1.5 text-[11.5px]"
                              >
                                Yes, delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDelete(null)}
                                className="btn btn-outline px-4 py-1.5 text-[11.5px]"
                              >
                                Keep it
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(index)}
                              className="btn btn-danger px-4 py-1.5 text-[11.5px]"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ---------- পাতার থিম ---------- */}
          <div className="bg-card border-default rounded-xl p-5">
            <h2 className="mb-1 text-[15px] font-medium text-primary">
              Page design
            </h2>
            <p className="mb-4 text-[12px] text-secondary">
              These are the defaults for the whole page. A section can still
              override any of them.
            </p>

            <div className="legal-admin__style" style={{ marginTop: 0 }}>
              <ColorField
                label="Accent colour"
                value={page.theme?.accent || ""}
                onChange={(value) => patchTheme("accent", value)}
                placeholder="var(--color-brand)"
              />
              <ColorField
                label="Header background"
                value={page.theme?.hero_background || ""}
                onChange={(value) => patchTheme("hero_background", value)}
                placeholder="var(--color-ink)"
              />
              <ColorField
                label="Header text"
                value={page.theme?.hero_ink || ""}
                onChange={(value) => patchTheme("hero_ink", value)}
                placeholder="#ffffff"
              />

              <TextField
                label="Base text size"
                value={page.theme?.body_size || ""}
                onChange={(value) => patchTheme("body_size", value)}
                placeholder="16px"
              />
              <TextField
                label="Base line height"
                value={page.theme?.line_height || ""}
                onChange={(value) => patchTheme("line_height", value)}
                placeholder="1.85"
              />
              <TextField
                label="Column width"
                value={page.theme?.content_width || ""}
                onChange={(value) => patchTheme("content_width", value)}
                placeholder="760px"
              />

              <SelectField
                label="Font"
                value={page.theme?.font || "sans"}
                onChange={(value) => patchTheme("font", value)}
                options={FONT_OPTIONS}
              />

              <div className="legal-admin__field">
                <label>Show on the page</label>
                <ToggleField
                  label="Contents list"
                  checked={page.theme?.show_toc !== false}
                  onChange={(checked) => patchTheme("show_toc", checked)}
                />
                <ToggleField
                  label="Language switch"
                  checked={page.theme?.show_lang_switch !== false}
                  onChange={(checked) => patchTheme("show_lang_switch", checked)}
                />
                <ToggleField
                  label="Print button"
                  checked={page.theme?.show_print !== false}
                  onChange={(checked) => patchTheme("show_print", checked)}
                />
                <ToggleField
                  label="Contact card"
                  checked={page.theme?.show_contact !== false}
                  onChange={(checked) => patchTheme("show_contact", checked)}
                />
              </div>
            </div>
          </div>

          {/* ---------- যোগাযোগ + SEO ---------- */}
          <div className="bg-card border-default rounded-xl p-5">
            <h2 className="mb-1 text-[15px] font-medium text-primary">
              Contact and search
            </h2>
            <p className="mb-4 text-[12px] text-secondary">
              Leave the contact boxes empty to use the restaurant details from
              Settings.
            </p>

            <div className="legal-admin__style" style={{ marginTop: 0 }}>
              <TextField
                label="Email"
                value={page.contact?.email || ""}
                onChange={(value) =>
                  patchPage({
                    contact: { ...(page.contact || {}), email: value },
                  })
                }
                placeholder="From Settings"
              />
              <TextField
                label="Phone"
                value={page.contact?.phone || ""}
                onChange={(value) =>
                  patchPage({
                    contact: { ...(page.contact || {}), phone: value },
                  })
                }
                placeholder="From Settings"
              />
              <TextField
                label={`Address (${lang === "en" ? "English" : "বাংলা"})`}
                value={page.contact?.address?.[lang] || ""}
                onChange={(value) =>
                  patchPage({
                    contact: {
                      ...(page.contact || {}),
                      address: {
                        ...(page.contact?.address || { en: "", bn: "" }),
                        [lang]: value,
                      },
                    },
                  })
                }
                placeholder="From Settings"
              />

              <TextField
                label="Browser tab title"
                value={page.seo?.meta_title?.[lang] || ""}
                onChange={(value) =>
                  patchPage({
                    seo: {
                      meta_title: {
                        ...(page.seo?.meta_title || { en: "", bn: "" }),
                        [lang]: value,
                      },
                      meta_description: page.seo?.meta_description || {
                        en: "",
                        bn: "",
                      },
                    },
                  })
                }
                placeholder={LEGAL_PAGE_LABEL[slug][lang]}
              />
              <TextField
                label="Search description"
                value={page.seo?.meta_description?.[lang] || ""}
                onChange={(value) =>
                  patchPage({
                    seo: {
                      meta_title: page.seo?.meta_title || { en: "", bn: "" },
                      meta_description: {
                        ...(page.seo?.meta_description || { en: "", bn: "" }),
                        [lang]: value,
                      },
                    },
                  })
                }
                placeholder="One sentence for Google"
                hint="Google reads the English one"
              />
            </div>
          </div>

          {/* ---------- বিপজ্জনক ---------- */}
          {isOwner ? (
            <div
              className="border-default rounded-xl p-5"
              style={{ background: "var(--accent-red-soft)" }}
            >
              <h2 className="text-[14px] font-medium text-primary">
                Start over
              </h2>
              <p className="mt-1 mb-3 text-[12px] text-secondary">
                Throws away everything on this page and puts the original draft
                back — in both languages. This cannot be undone.
              </p>

              {confirmReset ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] text-danger">
                    Reset {LEGAL_PAGE_LABEL[slug].en} to the starting draft?
                  </span>
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={saving}
                    className="btn btn-danger px-4 py-1.5 text-[11.5px]"
                  >
                    Yes, reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="btn btn-outline px-4 py-1.5 text-[11.5px]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="btn btn-outline px-4 py-1.5 text-[11.5px]"
                >
                  Reset this page
                </button>
              )}
            </div>
          ) : null}
        </div>

        {/* ============== RIGHT: PREVIEW ============== */}
        <div
          className={`${showPreview ? "block" : "hidden"} xl:sticky xl:top-6 xl:block`}
        >
          <div className="bg-card border-default overflow-hidden rounded-xl">
            <div className="border-default-b flex flex-wrap items-center justify-between gap-2 px-5 py-3">
              <h3 className="text-[14px] font-medium text-primary">
                Live preview
              </h3>
              <p className="text-[11.5px] text-secondary">
                Exactly how the page looks on the site.
              </p>
            </div>

            <div className="legal-admin__preview">
              {preview ? (
                // ভাষা বদলালে প্রিভিউটাও সেই ভাষায় খুলুক — তাই key তে ভাষা
                <LegalPageView key={slug} page={preview} forceLang={lang} />
              ) : (
                <p className="p-5 text-[13px] text-secondary">Building…</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalPagesManager;
