/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  Camera,
  Loader2,
  MapPin,
  Plus,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import {
  BD_DIVISIONS,
  BD_DIVISION_NAMES,
  DISTRICT_TO_DIVISION,
} from "@/src/config/bd-locations";
import { apiPatch, getApiErrorMessage } from "@/src/lib/apiClient";
import {
  deleteImage,
  replaceImage,
  validateImage,
  EMPTY_IMAGE,
} from "@/src/lib/upload";
import { useUser } from "@/src/app/components/Clients/Auth/UserProvider";
import ImageCropper from "@/src/app/components/Clients/Shared/ImageCropper";

/* ==========================================================================
   নিজের প্রোফাইল — GET/PATCH /api/v1/users/me
   --------------------------------------------------------------------------
   ফিল্ডগুলো সার্ভারের updateProfileSchema এর সাথে হুবহু মেলে, তাই এখানে
   যা পাঠানো যায় সার্ভারও ঠিক তাই নেয়।
   ========================================================================== */

const MAX_IMAGE_MB = 2;
const MAX_DISHES = 20;

type FormState = {
  name: string;
  email: string;
  division: string;
  district: string;
  village: string;
  address: string;
};

const EMPTY: FormState = {
  name: "",
  email: "",
  division: "",
  district: "",
  village: "",
  address: "",
};

export default function ProfileClient() {
  const { user, setUser } = useUser();
  const searchParams = useSearchParams();
  // লগইনের পর প্রোফাইল অসম্পূর্ণ থাকলে ?complete=1 দিয়ে পাঠানো হয়
  const needsCompletion = searchParams.get("complete") === "1";

  const [form, setForm] = useState<FormState>(EMPTY);
  const [dishes, setDishes] = useState<string[]>([]);
  const [dishDraft, setDishDraft] = useState("");
  const [image, setImage] = useState<{ url: string; public_id: string }>({
    url: "",
    public_id: "",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  /** যে ফাইলটা এই মুহূর্তে কাটা হচ্ছে — null মানে কাটার পর্দা বন্ধ */
  const [cropFile, setCropFile] = useState<File | null>(null);
  /**
   * কাটা ছবিটার স্থানীয় blob: URL। Cloudinary তে ওঠার আগেই অ্যাভাটারে
   * এটাই বসে, তাই "Use photo" চাপার সাথে সাথেই নতুন ছবিটা চোখে পড়ে —
   * নেটওয়ার্ক ধীর হলেও পুরোনো ছবিটা তাকিয়ে থাকে না।
   */
  const [preview, setPreview] = useState("");
  /**
   * ছবিটা বদলেছে কিন্তু এখনো সেভ হয়নি।
   * ছবি বদলালে কোনো টোস্ট দেখানো হয় না — নতুন ছবিটা সাথে সাথেই দেখা যায়,
   * তাই টোস্ট শুধু বাড়তি ঝামেলা। বদলে অ্যাভাটারের নিচে ছোট একটা লাইন
   * বসে, যেটা সেভ করা পর্যন্ত থাকে।
   */
  const [imageDirty, setImageDirty] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );

  const fileRef = useRef<HTMLInputElement>(null);
  /**
   * চালু থাকা blob: URL টা ref এও রাখি। খেয়াল রাখতে হবে — এটাকে
   * `[preview]` নির্ভর effect এর cleanup দিয়ে ছাড়া যায় না: StrictMode
   * ডেভেলপমেন্টে effect একবার চালিয়ে cleanup ডেকে আবার চালায়, ফলে
   * ছবিটা দেখানোর আগেই URL টা বাতিল হয়ে যেত। তাই নতুন ছবি বসানোর
   * সময় হাতে হাতে পুরোনোটা ছাড়ি, আর একদম শেষেরটা unmount এ।
   */
  const previewRef = useRef("");

  const dropPreview = useCallback(() => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = "";
  }, []);

  useEffect(() => () => dropPreview(), [dropPreview]);

  // সার্ভার থেকে আসা মান দিয়ে ফর্মটা একবার ভরে নিই
  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name ?? "",
      email: user.email ?? "",
      division: user.division ?? "",
      district: user.district ?? "",
      village: user.village ?? "",
      address: user.address ?? "",
    });
    setDishes(user.favorite_dishes ?? []);
    setImage({
      url: user.image?.url ?? "",
      public_id: user.image?.public_id ?? "",
    });
  }, [user]);

  // বিভাগ বাছা থাকলে সেই বিভাগের জেলাই কেবল দেখাই
  const districtOptions = useMemo(() => {
    if (form.division && form.division in BD_DIVISIONS) {
      return BD_DIVISIONS[form.division as keyof typeof BD_DIVISIONS];
    }
    return Object.values(BD_DIVISIONS).flat().sort();
  }, [form.division]);

  const set = (field: keyof FormState, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // বিভাগ বদলালে আগের জেলা আর মানানসই না থাকলে সেটা মুছে দিই
      if (field === "division" && prev.district) {
        // `as const` এর কারণে ইনডেক্স করলে টাপল ইউনিয়ন আসে — readonly string[] এ
        // ধরলে includes() সাধারণ string মেনে নেয়
        const allowed: readonly string[] | null = value
          ? BD_DIVISIONS[value as keyof typeof BD_DIVISIONS]
          : null;
        if (allowed && !allowed.includes(prev.district)) next.district = "";
      }
      // জেলা বাছলে বিভাগটা আমরাই বসিয়ে দিই — দুবার বাছতে হয় না
      if (field === "district" && value) {
        next.division = DISTRICT_TO_DIVISION[value] || prev.division;
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  /* ---------------- প্রিয় খাবার ---------------- */
  const addDish = () => {
    const value = dishDraft.trim();
    if (!value) return;
    if (dishes.length >= MAX_DISHES) {
      toast.error(`You can save at most ${MAX_DISHES} dishes`);
      return;
    }
    if (dishes.some((d) => d.toLowerCase() === value.toLowerCase())) {
      toast.error(`"${value}" is already on your list`);
      setDishDraft("");
      return;
    }
    setDishes((prev) => [...prev, value.slice(0, 60)]);
    setDishDraft("");
  };

  /* ---------------- ছবি ----------------
     ধাপ দুটো: ফাইল বাছা → কেটে নেওয়া → তারপর আপলোড।
     সরাসরি আপলোড করি না, কারণ যেকোনো মাপের ছবি অ্যাভাটারের গোল ঘরে
     বসালে মাথা কেটে যায়; কাটার পর সবার ছবিই এক মাপের বর্গাকার হয়। */
  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // একই ছবি আবার বাছলেও যেন change ইভেন্ট আসে
    if (!file) return;

    const problem = validateImage(file, MAX_IMAGE_MB);
    if (problem) {
      toast.error(problem);
      return;
    }

    setCropFile(file);
  };

  /** কাটা শেষ — এবার Cloudinary তে পাঠাই */
  const onCropped = async (cropped: File) => {
    setCropFile(null);

    // আপলোড শুরুর আগেই কাটা ছবিটা অ্যাভাটারে বসিয়ে দিই — গ্রাহক
    // সাথে সাথে দেখে তার বাছাই করা ছবিটাই বসেছে
    dropPreview();
    const localUrl = URL.createObjectURL(cropped);
    previewRef.current = localUrl;
    setPreview(localUrl);

    setUploading(true);
    try {
      // Cloudinary তে যায় → URL ফেরত আসে → পুরোনো ছবিটা মুছে যায়
      const uploaded = await replaceImage(cropped, "users", image);
      setImage(uploaded);
      // ছবিটা সাথে সাথেই চোখের সামনে বদলে যায়, তাই সফল হলে আর টোস্ট
      // দেখাই না — নিচের ছোট লেখাটাই মনে করিয়ে দেয় সেভ করা বাকি।
      setImageDirty(true);
    } catch (err) {
      // আপলোড হয়নি — প্রিভিউটাও তুলে নিই, নাহলে গ্রাহক ভাববে ছবিটা বসে গেছে
      dropPreview();
      setPreview("");
      toast.error(getApiErrorMessage(err, "Image upload failed"));
    } finally {
      setUploading(false);
    }
  };

  /** ছবি সরানো — Cloudinary থেকেও যাক, নাহলে ফাইলটা পড়ে থাকে */
  const removeImage = async () => {
    const previous = image;
    setImage(EMPTY_IMAGE);
    dropPreview();
    setPreview("");
    setImageDirty(true);
    await deleteImage(previous.public_id);
  };

  /* ---------------- সেভ ---------------- */
  const validate = () => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (form.name.trim() && form.name.trim().length < 3) {
      next.name = "Name must be at least 3 characters";
    }
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      next.email = "Enter a valid email address";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const res = await apiPatch<typeof user>("/api/v1/users/me", {
        name: form.name.trim(),
        email: form.email.trim(),
        division: form.division,
        district: form.district,
        village: form.village.trim(),
        address: form.address.trim(),
        favorite_dishes: dishes,
        image,
      });
      if (res.data) setUser(res.data);
      // সেভ হয়ে গেছে — ছবির "সেভ করা বাকি" লেখাটা আর দরকার নেই
      setImageDirty(false);
      toast.success(res.message);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  /** অ্যাভাটারে যা দেখা যাবে — কাটা ছবিটা আগে, না থাকলে সেভ করা ছবিটা */
  const avatarSrc = preview || image.url;

  const initials =
    (form.name || user?.phone || "?")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?";

  return (
    <form onSubmit={save} className="space-y-5">
      {/* ছবি বাছার পর কাটার পর্দা — কাটা শেষ হলেই আপলোড শুরু */}
      {cropFile && (
        <ImageCropper
          file={cropFile}
          title="Crop your photo"
          onCropped={onCropped}
          onCancel={() => setCropFile(null)}
        />
      )}

      {/* প্রোফাইল অসম্পূর্ণ — অর্ডারের আগে ভরে নেওয়াই ভালো */}
      {needsCompletion && (!user?.name || !user?.district) && (
        <div className="flex items-start gap-3 rounded-md border border-saffron-dark/40 bg-saffron-soft px-4 py-3.5">
          <Sparkles size={17} className="mt-0.5 flex-shrink-0 text-saffron-dark" />
          <p className="text-[13px] leading-relaxed text-ink">
            <span className="font-bold">Almost there.</span> Add your name and
            district once — checkout will fill itself in from now on.
          </p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px] lg:items-start">
        {/* ================= বাঁ পাশ — মূল তথ্য ================= */}
        <div className="site-card px-5 py-6 sm:px-7">
          <h2 className="text-[16px] font-bold text-ink">Your details</h2>
          <p className="mt-1 text-[13px] text-ink-soft">
            We use these to fill in your checkout and deliver to the right place.
          </p>

          <div className="mt-6 space-y-5">
            <Field label="Full name" error={errors.name}>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                maxLength={60}
                placeholder="e.g. Rahim Uddin"
                className={`site-input h-11 px-3.5 text-[14px] ${errors.name ? "is-invalid" : ""}`}
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Mobile number" hint="Your login — cannot be changed here">
                <input
                  type="tel"
                  value={user?.phone ?? ""}
                  disabled
                  className="site-input h-11 px-3.5 text-[14px] font-semibold"
                />
              </Field>

              <Field label="Email" hint="Optional" error={errors.email}>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="you@example.com"
                  className={`site-input h-11 px-3.5 text-[14px] ${errors.email ? "is-invalid" : ""}`}
                />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Division">
                <select
                  value={form.division}
                  onChange={(e) => set("division", e.target.value)}
                  className="site-input h-11 px-3 text-[14px]"
                >
                  <option value="">Select division</option>
                  {BD_DIVISION_NAMES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="District">
                <select
                  value={form.district}
                  onChange={(e) => set("district", e.target.value)}
                  className="site-input h-11 px-3 text-[14px]"
                >
                  <option value="">Select district</option>
                  {districtOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Village / area" hint="Optional">
              <input
                type="text"
                value={form.village}
                onChange={(e) => set("village", e.target.value)}
                maxLength={120}
                placeholder="e.g. Mirpur DOHS"
                className="site-input h-11 px-3.5 text-[14px]"
              />
            </Field>

            <Field label="Full address" hint="House, road, landmark">
              <textarea
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="House 12, Road 4, near the school gate…"
                className="site-input resize-none px-3.5 py-3 text-[14px]"
              />
              <span className="mt-1 block text-right text-[11px] text-ink-faint">
                {form.address.length}/300
              </span>
            </Field>
          </div>
        </div>

        {/* ================= ডান পাশ — ছবি + প্রিয় খাবার ================= */}
        <div className="space-y-5">
          <div className="site-card px-5 py-6 text-center">
            <div className="relative mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-brand-soft text-[24px] font-extrabold text-brand-dark">
              {/* কাটা ছবিটা (preview) থাকলে সেটাই আগে — Cloudinary এর URL
                  আসতে যত দেরিই হোক, পর্দায় নতুন ছবিটাই দেখা যায় */}
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt="Your photo"
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}

              {uploading && (
                <span className="absolute inset-0 grid place-items-center bg-ink/45">
                  <Loader2 size={22} className="animate-spin text-white" />
                </span>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onPickImage}
              className="hidden"
            />

            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="site-btn site-btn-outline h-9 px-4 text-[13px]"
              >
                {uploading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Uploading…
                  </>
                ) : (
                  <>
                    <Camera size={14} /> {avatarSrc ? "Change" : "Add photo"}
                  </>
                )}
              </button>

              {avatarSrc && (
                <button
                  type="button"
                  onClick={removeImage}
                  disabled={uploading}
                  className="site-btn site-btn-ghost h-9 px-3 text-[13px]"
                >
                  <X size={14} /> Remove
                </button>
              )}
            </div>
            {/* টোস্টের বদলে এই ছোট লাইনটা — সেভ না করা পর্যন্ত থাকে,
                তাই কেউ ছবি বদলে সেভ করতে ভুলে গেলেও চোখে পড়ে */}
            {imageDirty && !uploading ? (
              <p className="mt-2 text-[11.5px] font-semibold text-saffron-dark">
                Press Save to keep this photo
              </p>
            ) : (
              <p className="mt-2 text-[11.5px] text-ink-faint">
                JPG or PNG, up to {MAX_IMAGE_MB}MB — you can crop it after
                picking
              </p>
            )}
          </div>

          <div className="site-card px-5 py-6">
            <h2 className="text-[15px] font-bold text-ink">Favourite dishes</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
              Tell us what you love and we will point you at it first.
            </p>

            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={dishDraft}
                onChange={(e) => setDishDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDish();
                  }
                }}
                maxLength={60}
                placeholder="e.g. Kacchi Biryani"
                className="site-input h-10 flex-1 px-3 text-[13.5px]"
              />
              <button
                type="button"
                onClick={addDish}
                disabled={!dishDraft.trim()}
                className="site-btn site-btn-secondary h-10 px-3.5 text-[13px]"
              >
                <Plus size={15} />
              </button>
            </div>

            {dishes.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {dishes.map((dish) => (
                  <span
                    key={dish}
                    className="site-badge site-badge-brand gap-1.5 py-1.5 pl-3 pr-2 text-[12px]"
                  >
                    {dish}
                    <button
                      type="button"
                      onClick={() =>
                        setDishes((prev) => prev.filter((d) => d !== dish))
                      }
                      aria-label={`Remove ${dish}`}
                      className="transition-opacity hover:opacity-60"
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-[12.5px] text-ink-faint">
                Nothing saved yet.
              </p>
            )}

            <p className="mt-3 text-[11.5px] text-ink-faint">
              {dishes.length}/{MAX_DISHES} saved
            </p>
          </div>
        </div>
      </div>

      {/* ---------- সেভ বার ---------- */}
      <div className="site-card sticky bottom-3 flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <p className="flex items-center gap-1.5 text-[12.5px] text-ink-soft">
          <MapPin size={14} className="text-brand" />
          {form.district
            ? `Delivering to ${form.district}${form.division ? `, ${form.division}` : ""}`
            : "Pick a district so we can deliver to you"}
        </p>
        <button
          type="submit"
          disabled={saving || uploading}
          className="site-btn site-btn-primary h-11 px-6 text-[14px]"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Save size={16} /> Save changes
            </>
          )}
        </button>
      </div>
    </form>
  );
}

/* ---------- ছোট লেবেল র‍্যাপার — একই মার্কআপ বারবার না লেখার জন্য ---------- */
function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-bold text-ink">{label}</span>
        {hint && !error && (
          <span className="text-[11.5px] text-ink-faint">{hint}</span>
        )}
      </span>
      {children}
      {error && (
        <span className="mt-1 block text-[12px] font-semibold text-chili">
          {error}
        </span>
      )}
    </label>
  );
}
