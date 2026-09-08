/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { Plus, Trash2 } from "lucide-react";

import {
  ABOUT_ICON_KEYS,
  SOCIAL_PLATFORMS,
  WEEKDAYS,
  type IAboutHighlight,
  type IAboutMilestone,
  type IAboutStat,
  type IRestaurantSettings,
  type SocialPlatform,
} from "@/src/interfaces/settings.interface";
import { getApiErrorMessage } from "@/src/lib/apiClient";
import { replaceImage, uploadImage, validateImage } from "@/src/lib/upload";
import { Card, Field } from "./SettingsUi";

/* ==========================================================================
   SITE CONTENT — About, Contact, সোশ্যাল আর খোলার সময়
   --------------------------------------------------------------------------
   /about আর /contact পাতা দুটোর প্রতিটা লেখা, ছবি আর লিংক এখান থেকেই
   বদলায় — কোড ছুঁতে হয় না।

   সেটিংস পাতার বাকি অংশ (ভ্যাট, ডেলিভারি) থেকে আলাদা ফাইলে রাখা হয়েছে
   কারণ এটা দোকানের "মুখ", "নিয়ম" নয় — আর SettingsManager এমনিতেই যথেষ্ট
   লম্বা। সেভ করার কাজটা এখানে নেই; বাইরের ফর্মই সব একসাথে পাঠায়।
   ========================================================================== */

const MAX_PHOTO_MB = 3;
/** গ্যালারিতে এর বেশি ছবি রাখতে দিই না — পাতা ভারী হয়ে যায় */
const MAX_GALLERY = 8;

interface SiteContentSettingsProps {
  form: IRestaurantSettings;
  /** উপরের ফর্মে মান বসায় আর "সেভ করা বাকি" চিহ্নটা জ্বালায় */
  onChange: (patch: Partial<IRestaurantSettings>) => void;
}

/** সোশ্যাল মাঠগুলোর প্লেসহোল্ডার — ম্যানেজার কী বসাবে বুঝতে পারে */
const SOCIAL_HINT: Record<SocialPlatform, string> = {
  facebook: "https://facebook.com/yourpage",
  instagram: "https://instagram.com/yourpage",
  youtube: "https://youtube.com/@yourchannel",
  x: "https://x.com/yourpage",
  tiktok: "https://tiktok.com/@yourpage",
  linkedin: "https://linkedin.com/company/yourpage",
  whatsapp: "01712345678",
};

export default function SiteContentSettings({
  form,
  onChange,
}: SiteContentSettingsProps) {
  /** কোন ছবিটা এই মুহূর্তে আপলোড হচ্ছে — বোতামে "Uploading…" দেখাতে */
  const [busy, setBusy] = useState<string>("");

  /* ---------------- ছোট সেটার ---------------- */

  const setAbout = <K extends keyof IRestaurantSettings["about"]>(
    key: K,
    value: IRestaurantSettings["about"][K],
  ) => onChange({ about: { ...form.about, [key]: value } });

  const setContact = <K extends keyof IRestaurantSettings["contact"]>(
    key: K,
    value: IRestaurantSettings["contact"][K],
  ) => onChange({ contact: { ...form.contact, [key]: value } });

  const setSocial = (platform: SocialPlatform, value: string) =>
    onChange({ socials: { ...form.socials, [platform]: value } });

  const setHour = (
    day: number,
    patch: Partial<IRestaurantSettings["opening_hours"][number]>,
  ) =>
    onChange({
      opening_hours: form.opening_hours.map((row) =>
        row.day === day ? { ...row, ...patch } : row,
      ),
    });

  /* ---------------- ছবি ---------------- */

  /**
   * একটামাত্র ছবির মাঠ (কভার / গল্প / শেফ)।
   * পুরোনো ছবিটা Cloudinary থেকে মুছে যায় — নাহলে প্রতিবার বদলালে
   * সেখানে এতিম ফাইল জমতেই থাকত।
   *
   * শুধু URL টা সেটিংসে রাখা হয়, public_id নয় — তাই "আগেরটা মুছে ফেলো"
   * কাজটা `replaceImage` কে দেওয়া যায় না; আপলোডের পর নতুন URL বসিয়ে
   * দেওয়াই যথেষ্ট।
   */
  const pickImage = async (
    slot: "cover_image" | "story_image" | "chef_image",
    file: File | null,
  ) => {
    if (!file) return;

    const problem = validateImage(file, MAX_PHOTO_MB);
    if (problem) {
      toast.error(problem);
      return;
    }

    setBusy(slot);
    try {
      const uploaded = await replaceImage(file, "restaurant");
      setAbout(slot, uploaded.url);
      toast.success("Uploaded — press Save to keep it");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Image upload failed"));
    } finally {
      setBusy("");
    }
  };

  const addGalleryImage = async (file: File | null) => {
    if (!file) return;

    if (form.about.gallery.length >= MAX_GALLERY) {
      toast.error(`The gallery holds up to ${MAX_GALLERY} photos`);
      return;
    }

    const problem = validateImage(file, MAX_PHOTO_MB);
    if (problem) {
      toast.error(problem);
      return;
    }

    setBusy("gallery");
    try {
      const uploaded = await uploadImage(file, "restaurant");
      setAbout("gallery", [...form.about.gallery, uploaded.url]);
      toast.success("Added — press Save to keep it");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Image upload failed"));
    } finally {
      setBusy("");
    }
  };

  const removeGalleryImage = (src: string) =>
    setAbout(
      "gallery",
      form.about.gallery.filter((item) => item !== src),
    );

  /* ---------------- তালিকা সম্পাদনা ---------------- */

  const updateHighlight = (index: number, patch: Partial<IAboutHighlight>) =>
    setAbout(
      "highlights",
      form.about.highlights.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    );

  const updateStat = (index: number, patch: Partial<IAboutStat>) =>
    setAbout(
      "stats",
      form.about.stats.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );

  const updateMilestone = (index: number, patch: Partial<IAboutMilestone>) =>
    setAbout(
      "milestones",
      form.about.milestones.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    );

  return (
    <>
      {/* ================================================================
          সোশ্যাল মিডিয়া
          ================================================================ */}
      <Card
        title="Social media"
        hint="Empty ones simply do not appear on the site — no dead links"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {SOCIAL_PLATFORMS.map((platform) => (
            <Field
              key={platform}
              label={platform === "x" ? "X (Twitter)" : capitalise(platform)}
              hint={platform === "whatsapp" ? "Number only" : undefined}
            >
              <input
                value={form.socials[platform] || ""}
                onChange={(e) => setSocial(platform, e.target.value)}
                placeholder={SOCIAL_HINT[platform]}
                className="input-field h-10 w-full px-3 text-[14px]"
              />
            </Field>
          ))}
        </div>
      </Card>

      {/* ================================================================
          খোলার সময়
          ================================================================ */}
      <Card
        title="Opening hours"
        hint="Shown in the footer, on About and on Contact — and the “Open now” badge follows it"
      >
        <div className="space-y-2">
          {form.opening_hours
            // দেখানোর ক্রম সোমবার থেকে, যদিও ডাটায় রবিবার আগে
            .slice()
            .sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7))
            .map((row) => (
              <div
                key={row.day}
                className="border-default flex flex-wrap items-center gap-3 rounded-lg px-3 py-2.5"
              >
                <span className="text-primary w-24 text-[13px] font-medium">
                  {WEEKDAYS[row.day].long}
                </span>

                <label className="text-secondary flex cursor-pointer items-center gap-2 text-[12.5px]">
                  <input
                    type="checkbox"
                    checked={row.closed}
                    onChange={(e) => setHour(row.day, { closed: e.target.checked })}
                    className="h-4 w-4 cursor-pointer"
                  />
                  Closed
                </label>

                {!row.closed && (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={row.open}
                      onChange={(e) => setHour(row.day, { open: e.target.value })}
                      className="input-field h-9 px-2 text-[13px]"
                    />
                    <span className="text-muted text-[12px]">to</span>
                    <input
                      type="time"
                      value={row.close}
                      onChange={(e) => setHour(row.day, { close: e.target.value })}
                      className="input-field h-9 px-2 text-[13px]"
                    />
                  </div>
                )}
              </div>
            ))}
        </div>

        <p className="text-muted mt-3 text-[11.5px]">
          Closing past midnight is fine — put 14:00 to 00:30 and the badge still
          reads correctly.
        </p>
      </Card>

      {/* ================================================================
          About — উপরের অংশ
          ================================================================ */}
      <Card title="About page — header" hint="The first thing a guest reads">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Small label" hint="Above the title">
            <input
              value={form.about.eyebrow}
              onChange={(e) => setAbout("eyebrow", e.target.value)}
              maxLength={60}
              className="input-field h-10 w-full px-3 text-[14px]"
            />
          </Field>

          <Field label="Founded year" hint="Empty hides the badge">
            <input
              value={form.about.founded_year}
              onChange={(e) => setAbout("founded_year", e.target.value)}
              placeholder="2013"
              maxLength={12}
              className="input-field h-10 w-full px-3 text-[14px]"
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Headline" required>
              <input
                value={form.about.headline}
                onChange={(e) => setAbout("headline", e.target.value)}
                maxLength={140}
                className="input-field h-10 w-full px-3 text-[14px]"
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field label="Intro" hint="Also used as the page description in Google">
              <textarea
                value={form.about.intro}
                onChange={(e) => setAbout("intro", e.target.value)}
                rows={3}
                maxLength={600}
                className="input-field w-full resize-none px-3 py-2.5 text-[14px]"
              />
            </Field>
          </div>
        </div>

        <div className="mt-5">
          <ImageSlot
            label="Cover photo"
            hint="Wide shot of the room or a signature dish"
            value={form.about.cover_image}
            busy={busy === "cover_image"}
            onPick={(file) => pickImage("cover_image", file)}
            onClear={() => setAbout("cover_image", "")}
          />
        </div>
      </Card>

      {/* ================================================================
          About — গল্প
          ================================================================ */}
      <Card title="About page — your story">
        <div className="space-y-4">
          <Field label="Story title">
            <input
              value={form.about.story_title}
              onChange={(e) => setAbout("story_title", e.target.value)}
              maxLength={140}
              className="input-field h-10 w-full px-3 text-[14px]"
            />
          </Field>

          <Field
            label="Story"
            hint="Leave a blank line between paragraphs"
          >
            <textarea
              value={form.about.story}
              onChange={(e) => setAbout("story", e.target.value)}
              rows={9}
              maxLength={4000}
              className="input-field w-full px-3 py-2.5 text-[14px] leading-relaxed"
            />
          </Field>

          <ImageSlot
            label="Story photo"
            hint="Portrait shot works best here"
            value={form.about.story_image}
            busy={busy === "story_image"}
            onPick={(file) => pickImage("story_image", file)}
            onClear={() => setAbout("story_image", "")}
          />
        </div>
      </Card>

      {/* ================================================================
          About — কেন আমরা
          ================================================================ */}
      <Card
        title="About page — what you stand for"
        hint="Four cards read best; clear the title to drop one"
      >
        <div className="space-y-3">
          {form.about.highlights.map((item, index) => (
            <Row
              key={index}
              onRemove={() =>
                setAbout(
                  "highlights",
                  form.about.highlights.filter((_, i) => i !== index),
                )
              }
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[130px_1fr]">
                <select
                  value={item.icon}
                  onChange={(e) => updateHighlight(index, { icon: e.target.value })}
                  className="input-field h-10 w-full px-2 text-[13px]"
                >
                  {ABOUT_ICON_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {capitalise(key)}
                    </option>
                  ))}
                </select>

                <input
                  value={item.title}
                  onChange={(e) => updateHighlight(index, { title: e.target.value })}
                  placeholder="Title"
                  maxLength={80}
                  className="input-field h-10 w-full px-3 text-[14px]"
                />
              </div>

              <textarea
                value={item.text}
                onChange={(e) => updateHighlight(index, { text: e.target.value })}
                placeholder="One or two lines"
                rows={2}
                maxLength={240}
                className="input-field mt-3 w-full resize-none px-3 py-2 text-[13.5px]"
              />
            </Row>
          ))}
        </div>

        <AddButton
          label="Add a card"
          disabled={form.about.highlights.length >= 8}
          onClick={() =>
            setAbout("highlights", [
              ...form.about.highlights,
              { icon: "utensils", title: "", text: "" },
            ])
          }
        />
      </Card>

      {/* ================================================================
          About — সংখ্যা
          ================================================================ */}
      <Card
        title="About page — numbers"
        hint="Free text, so “১২+” or “10k+” both work"
      >
        <div className="space-y-3">
          {form.about.stats.map((item, index) => (
            <Row
              key={index}
              onRemove={() =>
                setAbout(
                  "stats",
                  form.about.stats.filter((_, i) => i !== index),
                )
              }
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr]">
                <input
                  value={item.value}
                  onChange={(e) => updateStat(index, { value: e.target.value })}
                  placeholder="12+"
                  maxLength={16}
                  className="input-field h-10 w-full px-3 text-[14px]"
                />
                <input
                  value={item.label}
                  onChange={(e) => updateStat(index, { label: e.target.value })}
                  placeholder="Years of cooking"
                  maxLength={60}
                  className="input-field h-10 w-full px-3 text-[14px]"
                />
              </div>
            </Row>
          ))}
        </div>

        <AddButton
          label="Add a number"
          disabled={form.about.stats.length >= 6}
          onClick={() =>
            setAbout("stats", [...form.about.stats, { value: "", label: "" }])
          }
        />
      </Card>

      {/* ================================================================
          About — সময়রেখা
          ================================================================ */}
      <Card title="About page — milestones" hint="The road so far, oldest first">
        <div className="space-y-3">
          {form.about.milestones.map((item, index) => (
            <Row
              key={index}
              onRemove={() =>
                setAbout(
                  "milestones",
                  form.about.milestones.filter((_, i) => i !== index),
                )
              }
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[110px_1fr]">
                <input
                  value={item.year}
                  onChange={(e) => updateMilestone(index, { year: e.target.value })}
                  placeholder="2013"
                  maxLength={12}
                  className="input-field h-10 w-full px-3 text-[14px]"
                />
                <input
                  value={item.title}
                  onChange={(e) => updateMilestone(index, { title: e.target.value })}
                  placeholder="What happened"
                  maxLength={80}
                  className="input-field h-10 w-full px-3 text-[14px]"
                />
              </div>

              <textarea
                value={item.text}
                onChange={(e) => updateMilestone(index, { text: e.target.value })}
                placeholder="One line about it"
                rows={2}
                maxLength={240}
                className="input-field mt-3 w-full resize-none px-3 py-2 text-[13.5px]"
              />
            </Row>
          ))}
        </div>

        <AddButton
          label="Add a milestone"
          disabled={form.about.milestones.length >= 10}
          onClick={() =>
            setAbout("milestones", [
              ...form.about.milestones,
              { year: "", title: "", text: "" },
            ])
          }
        />
      </Card>

      {/* ================================================================
          About — শেফ
          ================================================================ */}
      <Card
        title="About page — the chef"
        hint="Leave the name and quote empty to hide this section"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Name">
            <input
              value={form.about.chef_name}
              onChange={(e) => setAbout("chef_name", e.target.value)}
              maxLength={80}
              className="input-field h-10 w-full px-3 text-[14px]"
            />
          </Field>

          <Field label="Role">
            <input
              value={form.about.chef_title}
              onChange={(e) => setAbout("chef_title", e.target.value)}
              placeholder="Head Chef"
              maxLength={80}
              className="input-field h-10 w-full px-3 text-[14px]"
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Quote">
              <textarea
                value={form.about.chef_quote}
                onChange={(e) => setAbout("chef_quote", e.target.value)}
                rows={3}
                maxLength={600}
                className="input-field w-full resize-none px-3 py-2.5 text-[14px]"
              />
            </Field>
          </div>
        </div>

        <div className="mt-5">
          <ImageSlot
            label="Portrait"
            hint="Square photo, shown in a circle"
            value={form.about.chef_image}
            busy={busy === "chef_image"}
            onPick={(file) => pickImage("chef_image", file)}
            onClear={() => setAbout("chef_image", "")}
          />
        </div>
      </Card>

      {/* ================================================================
          About — গ্যালারি
          ================================================================ */}
      <Card
        title="About page — gallery"
        hint={`Up to ${MAX_GALLERY} photos; none means the section is hidden`}
      >
        {form.about.gallery.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-3">
            {form.about.gallery.map((src) => (
              <div key={src} className="relative">
                <img
                  src={src}
                  alt=""
                  className="border-default h-24 w-24 rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeGalleryImage(src)}
                  aria-label="Remove photo"
                  className="btn btn-ghost absolute -top-2 -right-2 h-7 w-7 rounded-full p-0"
                  style={{ background: "var(--color-chili)", color: "#fff" }}
                >
                  <Trash2 className="mx-auto h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <label className="btn btn-outline inline-flex cursor-pointer px-4 py-2 text-[13px]">
          {busy === "gallery" ? "Uploading…" : "Add photo"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              e.target.value = "";
              addGalleryImage(file);
            }}
          />
        </label>
      </Card>

      {/* ================================================================
          Contact পাতা
          ================================================================ */}
      <Card
        title="Contact page"
        hint="Address, phone and email come from “Restaurant details” above"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Small label">
            <input
              value={form.contact.eyebrow}
              onChange={(e) => setContact("eyebrow", e.target.value)}
              maxLength={60}
              className="input-field h-10 w-full px-3 text-[14px]"
            />
          </Field>

          <Field label="Booking phone" hint="Empty uses the main number">
            <input
              value={form.contact.reservation_phone}
              onChange={(e) => setContact("reservation_phone", e.target.value)}
              maxLength={40}
              className="input-field h-10 w-full px-3 text-[14px]"
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Headline">
              <input
                value={form.contact.headline}
                onChange={(e) => setContact("headline", e.target.value)}
                maxLength={140}
                className="input-field h-10 w-full px-3 text-[14px]"
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field label="Intro">
              <textarea
                value={form.contact.intro}
                onChange={(e) => setContact("intro", e.target.value)}
                rows={3}
                maxLength={600}
                className="input-field w-full resize-none px-3 py-2.5 text-[14px]"
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field
              label="Note under the form"
              hint="Also shown after a message is sent"
            >
              <textarea
                value={form.contact.response_note}
                onChange={(e) => setContact("response_note", e.target.value)}
                rows={2}
                maxLength={240}
                className="input-field w-full resize-none px-3 py-2.5 text-[14px]"
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field
              label="Google map"
              hint="Google Maps → Share → Embed a map → copy"
            >
              <textarea
                value={form.contact.map_embed}
                onChange={(e) => setContact("map_embed", e.target.value)}
                rows={3}
                placeholder='Paste the whole <iframe …> or just its link'
                className="input-field w-full resize-none px-3 py-2.5 font-mono text-[12px]"
              />
            </Field>
            <p className="text-muted mt-1.5 text-[11.5px]">
              Paste the entire embed code if you like — the link inside it is
              picked out on save.
            </p>
          </div>

          <div className="md:col-span-2">
            <Field
              label="Directions link"
              hint="Empty builds one from the address"
            >
              <input
                value={form.contact.map_link}
                onChange={(e) => setContact("map_link", e.target.value)}
                placeholder="https://maps.app.goo.gl/…"
                className="input-field h-10 w-full px-3 text-[14px]"
              />
            </Field>
          </div>
        </div>

        {form.contact.map_embed && (
          <div className="border-default mt-5 overflow-hidden rounded-lg">
            <iframe
              // সেভ করার আগেই দেখা যায় ম্যাপটা ঠিক জায়গা দেখাচ্ছে কিনা
              src={extractMapSrc(form.contact.map_embed)}
              title="Map preview"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              className="h-56 w-full border-0"
            />
          </div>
        )}
      </Card>
    </>
  );
}

/* ==========================================================================
   ছোট হেল্পার
   ========================================================================== */

/** ম্যানেজার আস্ত iframe পেস্ট করলেও প্রিভিউটা যেন কাজ করে */
function extractMapSrc(value: string): string {
  const match = value.match(/src=["']([^"']+)["']/i);
  return (match ? match[1] : value).trim();
}

const capitalise = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

/** একটামাত্র ছবির মাঠ — থাম্বনেইল, আপলোড আর সরানোর বোতাম */
function ImageSlot({
  label,
  hint,
  value,
  busy,
  onPick,
  onClear,
}: {
  label: string;
  hint?: string;
  value: string;
  busy: boolean;
  onPick: (file: File | null) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div
        className="border-default flex h-20 w-28 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg"
        style={{ background: "var(--accent-blue-soft)" }}
      >
        {value ? (
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-muted text-[11px]">No photo</span>
        )}
      </div>

      <div>
        <p className="text-primary text-[13px] font-medium">{label}</p>
        {hint && <p className="text-muted mt-0.5 text-[11.5px]">{hint}</p>}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="btn btn-outline cursor-pointer px-4 py-1.5 text-[12.5px]">
            {busy ? "Uploading…" : value ? "Change" : "Upload"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                e.target.value = "";
                onPick(file);
              }}
            />
          </label>

          {value && (
            <button
              type="button"
              onClick={onClear}
              className="btn btn-ghost px-3 py-1.5 text-[12.5px]"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** তালিকার একটা সারি — ডানদিকে মোছার বোতাম */
function Row({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <div className="border-default relative rounded-lg p-3 pr-12">
      {children}

      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove"
        className="btn btn-ghost absolute top-3 right-3 h-8 w-8 p-0"
      >
        <Trash2 className="mx-auto h-4 w-4" />
      </button>
    </div>
  );
}

function AddButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="btn btn-outline mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-[13px] disabled:opacity-50"
    >
      <Plus className="h-4 w-4" />
      {label}
    </button>
  );
}
