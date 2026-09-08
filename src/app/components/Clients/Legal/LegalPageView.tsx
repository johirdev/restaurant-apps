"use client";

/**
 * LegalPageView — Privacy / Terms / Refund তিনটে পাতাই এই একটা কম্পোনেন্ট
 * --------------------------------------------------------------------------
 * পাতার সব লেখা আর সাজ ড্যাশবোর্ড থেকে আসে (`/api/v1/legal/:slug`), এখানে
 * হার্ডকোড করা কোনো নীতি নেই। এই ফাইলটা শুধু সাজিয়ে দেখায়:
 *
 *   হিরো (শিরোনাম, তারিখ, ভাষা বদল, প্রিন্ট)
 *   ├── বাঁয়ে  : আঠালো সূচিপত্র, পড়তে পড়তে নিজেই হাইলাইট হয়
 *   └── ডানে   : ভূমিকা + সেকশনগুলো
 *   নিচে      : যোগাযোগের কার্ড + বাকি দুই পাতার লিংক
 *
 * ভাষা: পাঠক নিজে en/bn বেছে নেন, পছন্দটা localStorage এ থাকে। প্রথম
 * রেন্ডারে সবসময় `page.default_lang` ব্যবহার হয় — সার্ভার আর ব্রাউজারের
 * HTML এক রাখার জন্য; localStorage পড়া হয় মাউন্টের পরে।
 *
 * এক ভাষায় কিছু লেখা না থাকলে অন্য ভাষার লেখাটাই দেখানো হয়, তাই পাতা
 * কখনো অর্ধেক ফাঁকা যায় না।
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUp,
  BadgeCheck,
  Ban,
  ChevronRight,
  Clock3,
  Cookie,
  CreditCard,
  Database,
  FileText,
  HelpCircle,
  ListTree,
  Lock,
  Mail,
  MapPin,
  Phone,
  Printer,
  RefreshCcw,
  Scale,
  Share2,
  Shield,
  Truck,
  UserCheck,
  UtensilsCrossed,
} from "lucide-react";

import {
  LEGAL_PAGE_LABEL,
  LEGAL_PAGE_PATH,
  LEGAL_SLUGS,
  type ILegalPage,
  type ILegalSection,
  type ILocalizedText,
  type LegalLang,
  type LegalSlug,
} from "@/src/interfaces/legal.interface";
import { htmlToText } from "@/src/lib/sanitizeHtml";
import { useSettings } from "@/src/store/settings.store";

import "./legalPage.css";

/* ------------------------------------------------------------------ */
/* পাতার নিজের লেখা ছাড়া বাকি যেসব শব্দ পর্দায় আসে                    */
/* ------------------------------------------------------------------ */

const UI: Record<LegalLang, Record<string, string>> = {
  en: {
    eyebrow: "Legal",
    onThisPage: "On this page",
    effective: "Effective from",
    updated: "Last updated",
    readTime: "min read",
    print: "Print this page",
    questions: "Still have a question?",
    questionsNote:
      "Anything on this page that is not clear — call us, we would rather explain it than have you guess.",
    callUs: "Call us",
    emailUs: "Email us",
    visitUs: "Visit us",
    alsoRead: "Also worth reading",
    backToTop: "Back to top",
    empty: "This page is being written. Please check back soon.",
    langLabel: "Language",
  },
  bn: {
    eyebrow: "আইনি",
    onThisPage: "এই পাতায় যা আছে",
    effective: "কার্যকর",
    updated: "সর্বশেষ হালনাগাদ",
    readTime: "মিনিটের পড়া",
    print: "পাতাটা প্রিন্ট করুন",
    questions: "কিছু বুঝতে অসুবিধা হচ্ছে?",
    questionsNote:
      "এই পাতার কোনো কথা পরিষ্কার না হলে ফোন করুন — আন্দাজ করার চেয়ে আমাদের বুঝিয়ে বলাই ভালো।",
    callUs: "ফোন করুন",
    emailUs: "ইমেইল করুন",
    visitUs: "আমাদের ঠিকানা",
    alsoRead: "এগুলোও পড়ে দেখতে পারেন",
    backToTop: "উপরে ফিরে যান",
    empty: "পাতাটা এখনো লেখা হচ্ছে। একটু পরে আবার দেখুন।",
    langLabel: "ভাষা",
  },
};

/* ------------------------------------------------------------------ */
/* সেকশনের আইকন — এডিটরে যে নামগুলো বাছা যায়, তার ম্যাপ                */
/* ------------------------------------------------------------------ */

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  shield: Shield,
  lock: Lock,
  database: Database,
  share: Share2,
  cookie: Cookie,
  user: UserCheck,
  clock: Clock3,
  mail: Mail,
  file: FileText,
  scale: Scale,
  card: CreditCard,
  truck: Truck,
  utensils: UtensilsCrossed,
  alert: AlertTriangle,
  refresh: RefreshCcw,
  ban: Ban,
  check: BadgeCheck,
  help: HelpCircle,
};

/* ------------------------------------------------------------------ */
/* ছোট হাতিয়ার                                                        */
/* ------------------------------------------------------------------ */

/** বেছে নেওয়া ভাষায় লেখা নেই? তবে অন্য ভাষারটাই দেখাই — ফাঁকা নয় */
const pick = (text: ILocalizedText | undefined, lang: LegalLang): string => {
  if (!text) return "";
  const chosen = (text[lang] || "").trim();
  if (chosen) return chosen;
  return (text[lang === "en" ? "bn" : "en"] || "").trim();
};

const formatDate = (value: string | Date | undefined, lang: LegalLang) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

/** বাংলায় সংখ্যাটাও বাংলা অঙ্কে দেখানো হয় */
const toLocalDigits = (value: number, lang: LegalLang) =>
  lang === "bn"
    ? String(value).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)])
    : String(value);

/**
 * সেকশনের সাজ → inline CSS ভ্যারিয়েবল।
 * ফাঁকা মানগুলো বাদ দেওয়া হয়, ফলে CSS এর নিজের ডিফল্ট টিকে থাকে —
 * ম্যানেজার যেটুকু বদলেছেন শুধু সেটুকুই এখানে আসে।
 */
const styleVars = (section: ILegalSection): React.CSSProperties => {
  const s = section.style || {};
  const vars: Record<string, string> = {};

  const set = (name: string, value?: string) => {
    if (value && value.trim()) vars[name] = value.trim();
  };

  set("--sec-heading-size", s.heading_size);
  set("--sec-heading-color", s.heading_color);
  set("--sec-heading-weight", s.heading_weight);
  set("--sec-body-size", s.body_size);
  set("--sec-body-color", s.body_color);
  set("--sec-line-height", s.line_height);
  set("--sec-letter-spacing", s.letter_spacing);
  set("--sec-align", s.align);
  set("--sec-space-above", s.space_above);
  set("--sec-space-below", s.space_below);
  set("--sec-background", s.background);
  set("--sec-accent", s.accent);

  return vars as React.CSSProperties;
};

const themeVars = (page: ILegalPage): React.CSSProperties => {
  const t = page.theme || {};
  const vars: Record<string, string> = {};

  const set = (name: string, value?: string) => {
    if (value && value.trim()) vars[name] = value.trim();
  };

  set("--legal-accent", t.accent);
  set("--legal-hero-bg", t.hero_background);
  set("--legal-hero-ink", t.hero_ink);
  set("--legal-body-size", t.body_size);
  set("--legal-line-height", t.line_height);
  set("--legal-content-width", t.content_width);

  if (t.font === "bengali") vars["--legal-font"] = "var(--font-bengali)";
  else if (t.font === "serif") vars["--legal-font"] = "Georgia, 'Times New Roman', serif";

  return vars as React.CSSProperties;
};

/* ------------------------------------------------------------------ */

interface LegalPageViewProps {
  page: ILegalPage;
  /**
   * ড্যাশবোর্ডের প্রিভিউ ঠিক যে ভাষাটা এখন সম্পাদনা হচ্ছে সেটাই দেখাবে।
   * এটা দেওয়া থাকলে পাঠকের সংরক্ষিত পছন্দ পড়া হয় না — নাহলে ম্যানেজার
   * বাংলা লিখছেন অথচ প্রিভিউতে ইংরেজি দেখা যেত।
   */
  forceLang?: LegalLang;
}

const STORAGE_KEY = "legal-lang";

const LegalPageView = ({ page, forceLang }: LegalPageViewProps) => {
  const settings = useSettings();

  /* ---------------------------------------------------------- ভাষা */
  // প্রথম রেন্ডার সবসময় ডিফল্ট ভাষায় — নাহলে সার্ভারের HTML এর সাথে
  // মেলে না আর React hydration এ অভিযোগ করে। পাঠকের সংরক্ষিত পছন্দ
  // মাউন্টের পরে বসে।
  const [readerLang, setReaderLang] = useState<LegalLang>(
    page.default_lang || "en",
  );

  // ড্যাশবোর্ডের প্রিভিউ ভাষাটা বাইরে থেকে ঠিক করে দেয়, তখন পাঠকের
  // পছন্দটা হিসাবেই আসে না
  const lang = forceLang ?? readerLang;

  useEffect(() => {
    if (forceLang) return;

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      // রেন্ডারের সময় localStorage পড়া যায় না — সার্ভারে ওটা নেই, আর
      // পড়লে সার্ভার আর ব্রাউজারের HTML আলাদা হয়ে hydration ভাঙে। তাই
      // পছন্দটা মাউন্টের পরেই বসাতে হয়, একবারই।
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "en" || saved === "bn") setReaderLang(saved);
    } catch {
      // প্রাইভেট ব্রাউজিংয়ে localStorage বন্ধ থাকতে পারে — ডিফল্টই চলুক
    }
  }, [forceLang]);

  const changeLang = (next: LegalLang) => {
    setReaderLang(next);
    // প্রিভিউতে পছন্দটা মনে রাখা হয় না — ম্যানেজারের সম্পাদনার ভাষা আর
    // পাঠকের পড়ার ভাষা দুটো আলাদা জিনিস
    if (forceLang) return;

    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // পছন্দটা মনে রাখা গেল না, তাতে পাতা দেখতে অসুবিধা নেই
    }
  };

  const t = UI[lang];

  /* -------------------------------------------------------- সেকশন */
  const sections = useMemo(
    () =>
      (page.sections || []).filter(
        (section) =>
          section.status !== "hidden" &&
          (pick(section.heading, lang) || pick(section.body, lang)),
      ),
    [page.sections, lang],
  );

  /** পড়তে কত সময় লাগবে — শব্দ গুনে, ২০০ শব্দ/মিনিট ধরে */
  const readMinutes = useMemo(() => {
    const words = sections
      .map((section) => htmlToText(pick(section.body, lang)))
      .join(" ")
      .split(/\s+/)
      .filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  }, [sections, lang]);

  /* ------------------------------------------- পড়তে পড়তে সূচি হাইলাইট */
  const [activeKey, setActiveKey] = useState<string>("");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sections.length === 0) return;

    const headings = sections
      .map((section) => document.getElementById(section.key))
      .filter((el): el is HTMLElement => Boolean(el));

    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // পর্দায় থাকা সেকশনগুলোর মধ্যে সবচেয়ে উপরেরটাই "এখন পড়ছি"
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible[0]) setActiveKey(visible[0].target.id);
      },
      // উপরের ১২০px নেভবারের নিচে ঢাকা পড়ে, তাই সেটুকু বাদ
      { rootMargin: "-120px 0px -65% 0px", threshold: 0 },
    );

    headings.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  /* -------------------------------------------------- উপরে ফেরার বোতাম */
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ------------------------------------------------------- সূচিতে ক্লিক */
  const jumpTo = useCallback((key: string) => {
    const target = document.getElementById(key);
    if (!target) return;

    // নেভবারটা আঠালো, তাই শিরোনামটা তার নিচে চাপা পড়ে যায় — ১১০px উপরে থামি
    const top = target.getBoundingClientRect().top + window.scrollY - 110;
    window.scrollTo({ top, behavior: "smooth" });
    setActiveKey(key);
  }, []);

  /* ------------------------------------------------------ যোগাযোগ */
  // পাতায় আলাদা করে কিছু লেখা না থাকলে দোকানের সেটিংস থেকেই আসে
  const contactEmail = page.contact?.email || settings.email || "";
  const contactPhone = page.contact?.phone || settings.phone || "";
  const contactAddress =
    pick(page.contact?.address, lang) || settings.address || "";

  const otherPages = LEGAL_SLUGS.filter((slug) => slug !== page.slug);

  const effectiveDate = formatDate(page.effective_date, lang);
  const showToc = page.theme?.show_toc !== false && sections.length > 1;

  return (
    <div className="legal-page" style={themeVars(page)} data-lang={lang}>
      {/* ============================ HERO ============================ */}
      <header className="legal-hero">
        <div className="legal-hero__decor" aria-hidden="true">
          <span className="legal-hero__glow legal-hero__glow--a" />
          <span className="legal-hero__glow legal-hero__glow--b" />
          <span className="legal-hero__grid" />
        </div>

        <div className="legal-hero__inner">
          <nav className="legal-crumbs" aria-label="Breadcrumb">
            <Link href="/">{lang === "bn" ? "হোম" : "Home"}</Link>
            <ChevronRight aria-hidden="true" />
            <span>{pick(page.title, lang)}</span>
          </nav>

          <span className="legal-hero__eyebrow">{t.eyebrow}</span>
          <h1 className="legal-hero__title">{pick(page.title, lang)}</h1>

          {pick(page.subtitle, lang) ? (
            <p className="legal-hero__subtitle">{pick(page.subtitle, lang)}</p>
          ) : null}

          <div className="legal-hero__meta">
            {effectiveDate ? (
              <span className="legal-chip">
                <Clock3 aria-hidden="true" />
                {t.effective} {effectiveDate}
              </span>
            ) : null}

            <span className="legal-chip">
              <FileText aria-hidden="true" />
              {toLocalDigits(readMinutes, lang)} {t.readTime}
            </span>

            {page.theme?.show_lang_switch !== false ? (
              <div
                className="legal-lang"
                role="group"
                aria-label={t.langLabel}
              >
                <button
                  type="button"
                  onClick={() => changeLang("en")}
                  className={lang === "en" ? "is-active" : undefined}
                  aria-pressed={lang === "en"}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => changeLang("bn")}
                  className={lang === "bn" ? "is-active" : undefined}
                  aria-pressed={lang === "bn"}
                >
                  বাংলা
                </button>
              </div>
            ) : null}

            {page.theme?.show_print !== false ? (
              <button
                type="button"
                onClick={() => window.print()}
                className="legal-chip legal-chip--btn"
              >
                <Printer aria-hidden="true" />
                {t.print}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {/* ============================ BODY ============================ */}
      <div className={`legal-body${showToc ? "" : " legal-body--wide"}`}>
        {/* ---------------- সূচিপত্র ---------------- */}
        {showToc ? (
          <aside className="legal-toc" aria-label={t.onThisPage}>
            <div className="legal-toc__inner">
              <h2 className="legal-toc__title">
                <ListTree aria-hidden="true" />
                {t.onThisPage}
              </h2>

              <ol className="legal-toc__list">
                {sections.map((section, index) => (
                  <li key={section.key}>
                    <button
                      type="button"
                      onClick={() => jumpTo(section.key)}
                      className={
                        activeKey === section.key ? "is-active" : undefined
                      }
                    >
                      <span className="legal-toc__num">
                        {toLocalDigits(index + 1, lang)}
                      </span>
                      <span className="legal-toc__label">
                        {pick(section.heading, lang)}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        ) : null}

        {/* ---------------- মূল লেখা ---------------- */}
        <main className="legal-content" ref={contentRef}>
          {pick(page.intro, lang) ? (
            <div
              className="legal-intro legal-rich"
              dangerouslySetInnerHTML={{ __html: pick(page.intro, lang) }}
            />
          ) : null}

          {sections.length === 0 ? (
            <p className="legal-empty">{t.empty}</p>
          ) : null}

          {sections.map((section, index) => {
            const Icon = ICONS[section.icon || "file"] || FileText;
            const style = section.style || {};

            return (
              <section
                key={section.key}
                id={section.key}
                style={styleVars(section)}
                className={[
                  "legal-section",
                  style.card ? "legal-section--card" : "",
                  style.divider ? "legal-section--divider" : "",
                  style.accent ? "legal-section--accent" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <h2 className="legal-section__heading">
                  <span className="legal-section__icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <span className="legal-section__num" aria-hidden="true">
                    {toLocalDigits(index + 1, lang)}.
                  </span>
                  {pick(section.heading, lang)}
                </h2>

                <div
                  className="legal-section__body legal-rich"
                  dangerouslySetInnerHTML={{ __html: pick(section.body, lang) }}
                />
              </section>
            );
          })}

          {/* ---------------- যোগাযোগ ---------------- */}
          {page.theme?.show_contact !== false &&
          (contactEmail || contactPhone || contactAddress) ? (
            <aside className="legal-contact">
              <h2 className="legal-contact__title">{t.questions}</h2>
              <p className="legal-contact__note">{t.questionsNote}</p>

              <ul className="legal-contact__list">
                {contactPhone ? (
                  <li>
                    <span className="legal-contact__icon">
                      <Phone aria-hidden="true" />
                    </span>
                    <span>
                      <strong>{t.callUs}</strong>
                      <a href={`tel:${contactPhone.replace(/\s+/g, "")}`}>
                        {contactPhone}
                      </a>
                    </span>
                  </li>
                ) : null}

                {contactEmail ? (
                  <li>
                    <span className="legal-contact__icon">
                      <Mail aria-hidden="true" />
                    </span>
                    <span>
                      <strong>{t.emailUs}</strong>
                      <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
                    </span>
                  </li>
                ) : null}

                {contactAddress ? (
                  <li>
                    <span className="legal-contact__icon">
                      <MapPin aria-hidden="true" />
                    </span>
                    <span>
                      <strong>{t.visitUs}</strong>
                      <span className="legal-contact__plain">
                        {contactAddress}
                      </span>
                    </span>
                  </li>
                ) : null}
              </ul>
            </aside>
          ) : null}

          {/* ---------------- বাকি দুই পাতা ---------------- */}
          <nav className="legal-related" aria-label={t.alsoRead}>
            <h2 className="legal-related__title">{t.alsoRead}</h2>
            <div className="legal-related__grid">
              {otherPages.map((slug) => (
                <Link
                  key={slug}
                  href={LEGAL_PAGE_PATH[slug as LegalSlug]}
                  className="legal-related__card"
                >
                  <span className="legal-related__icon">
                    {slug === "privacy" ? (
                      <Shield aria-hidden="true" />
                    ) : slug === "terms" ? (
                      <Scale aria-hidden="true" />
                    ) : (
                      <RefreshCcw aria-hidden="true" />
                    )}
                  </span>
                  <span className="legal-related__label">
                    {LEGAL_PAGE_LABEL[slug as LegalSlug][lang]}
                  </span>
                  <ChevronRight
                    className="legal-related__arrow"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          </nav>
        </main>
      </div>

      {/* ---------------- উপরে ফেরা ---------------- */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`legal-top${showTop ? " is-visible" : ""}`}
        aria-label={t.backToTop}
      >
        <ArrowUp aria-hidden="true" />
      </button>
    </div>
  );
};

export default LegalPageView;
