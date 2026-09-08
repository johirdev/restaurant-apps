/* eslint-disable react-hooks/set-state-in-effect */
"use client";

/**
 * BannerManager — হোম পেজের হিরো ব্যানার
 * --------------------------------------------------------------------------
 * বাঁয়ে ফর্ম, ডানে লাইভ প্রিভিউ আর ব্যানারের তালিকা।
 *
 * প্রিভিউটা সাইটের আসল <HeroBannerSlide /> দিয়েই আঁকা হয় — অর্থাৎ এখানে
 * যা দেখছেন, হোম পেজে হুবহু সেটাই যাবে।
 *
 *   GET    /api/v1/banners        → তালিকা (ম্যানেজমেন্ট)
 *   POST   /api/v1/banners        → নতুন
 *   PATCH  /api/v1/banners/:id    → বদল
 *   DELETE /api/v1/banners/:id    → মুছে ফেলা (DeleteModal করে)
 *   POST   /api/v1/upload         → ছবি (folder: banners)
 */

import { useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

import DeleteModal from "@/src/app/Layout/DeleteModal/DeleteModal";
import { compressImage } from "@/src/app/Layout/Compressimage/Compressimage";
import { AuthContext } from "@/src/app/dashboard/AuthProvider";
import { getApiErrorMessage } from "@/src/lib/apiClient";
import { deleteImage, uploadImage } from "@/src/lib/upload";
import {
  HeroBannerSlide,
  type Banner,
} from "@/src/app/components/Clients/Banner/HeroBanner";

type Status = "active" | "inactive";

interface FormState {
  image: string;
  image_public_id: string;
  eyebrow: string;
  title: string;
  highlight: string;
  subtitle: string;
  button_label: string;
  button_link: string;
  bg_color: string;
  accent_color: string;
  text_color: string;
  sort_order: string;
  status: Status;
}

const EMPTY_FORM: FormState = {
  image: "",
  image_public_id: "",
  eyebrow: "",
  title: "Taste the\nAuthentic Flavor",
  highlight: "",
  subtitle:
    "Experience culinary excellence with our curated menu of exquisite, locally sourced ingredients and crafted with passion.",
  button_label: "Order Now",
  button_link: "/foods",
  bg_color: "",
  accent_color: "",
  text_color: "",
  sort_order: "0",
  status: "active",
};

/** কালার পিকারে দেখানোর জন্য — ফাঁকা মানে "থিমের রঙ" */
const THEME_FALLBACK = {
  bg_color: "#1c1c28",
  accent_color: "#d70f64",
  text_color: "#ffffff",
} as const;

/** ফর্মের অবস্থাকে সাইটের ব্যানার শেপে বদলায় — প্রিভিউ এটাই খায় */
const formToBanner = (form: FormState): Banner => ({
  _id: "preview",
  eyebrow: form.eyebrow,
  title: form.title || "Your headline goes here",
  highlight: form.highlight,
  subtitle: form.subtitle,
  button_label: form.button_label,
  button_link: form.button_link,
  image: form.image,
  bg_color: form.bg_color,
  accent_color: form.accent_color,
  text_color: form.text_color,
});

const BannerManager = () => {
  const { token } = useContext(AuthContext);
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [titleError, setTitleError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---------------------------------------------------------------- LOAD */
  const fetchBanners = async () => {
    try {
      const res = await axios.get("/api/v1/banners", authHeader);
      setBanners(res.data?.data ?? []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to load banners"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------------------------------------------------- FORM */
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setTitleError("");
    setMode("create");
    setEditingId(null);
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startEdit = (banner: Banner) => {
    setForm({
      image: banner.image || "",
      image_public_id:
        (banner as { image_public_id?: string }).image_public_id || "",
      eyebrow: banner.eyebrow || "",
      title: banner.title || "",
      highlight: banner.highlight || "",
      subtitle: banner.subtitle || "",
      button_label: banner.button_label || "",
      button_link: banner.button_link || "",
      bg_color: banner.bg_color || "",
      accent_color: banner.accent_color || "",
      text_color: banner.text_color || "",
      sort_order: String(banner.sort_order ?? 0),
      status: (banner.status as Status) || "active",
    });
    setTitleError("");
    setImageFile(null);
    setImagePreview("");
    setMode("edit");
    setEditingId(banner._id);
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const set = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "title") setTitleError("");
  };

  /* --------------------------------------------------------------- IMAGE */
  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }

    const originalKB = Math.round(file.size / 1024);
    setCompressing(true);
    try {
      // ব্যানারের ছবি বড় পর্দাজুড়ে বসে, তাই ক্যাটাগরির চেয়ে বেশি জায়গা দিই
      const compressed = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1200,
        maxSizeKB: 600,
      });
      setImageFile(compressed);
      setImagePreview(URL.createObjectURL(compressed));

      const finalKB = Math.round(compressed.size / 1024);
      if (originalKB > finalKB + 20) {
        toast.info(`Image optimized: ${originalKB}KB → ${finalKB}KB`);
      }
    } catch {
      // কমপ্রেস না হলে আসল ফাইলটাই যাক — কাজ আটকে রাখার মানে নেই
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } finally {
      setCompressing(false);
    }
  };

  const clearImage = async () => {
    if (form.image_public_id) await deleteImage(form.image_public_id);
    setForm((prev) => ({ ...prev, image: "", image_public_id: "" }));
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ---------------------------------------------------------------- SAVE */
  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setTitleError("Banner title is required");
      return;
    }

    setSubmitting(true);
    try {
      let image = form.image;
      let imagePublicId = form.image_public_id;

      if (imageFile) {
        const uploaded = await uploadImage(imageFile, "banners");
        // নতুনটা হাতে আসার পরেই পুরোনোটা মুছি
        if (imagePublicId && imagePublicId !== uploaded.public_id) {
          await deleteImage(imagePublicId);
        }
        image = uploaded.url;
        imagePublicId = uploaded.public_id;
      }

      const payload = {
        eyebrow: form.eyebrow.trim(),
        title: form.title.trim(),
        highlight: form.highlight.trim(),
        subtitle: form.subtitle.trim(),
        button_label: form.button_label.trim(),
        button_link: form.button_link.trim(),
        image,
        image_public_id: imagePublicId,
        bg_color: form.bg_color,
        accent_color: form.accent_color,
        text_color: form.text_color,
        sort_order: Number(form.sort_order) || 0,
        status: form.status,
      };

      if (mode === "create") {
        await axios.post("/api/v1/banners", payload, authHeader);
        toast.success("Banner created successfully!");
      } else {
        await axios.patch(`/api/v1/banners/${editingId}`, payload, authHeader);
        toast.success("Banner updated successfully!");
      }

      resetForm();
      setFormOpen(false);
      fetchBanners();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save banner"));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (banner: Banner) => {
    const next: Status = banner.status === "active" ? "inactive" : "active";
    try {
      await axios.patch(
        `/api/v1/banners/${banner._id}`,
        { status: next },
        authHeader,
      );
      setBanners((prev) =>
        prev.map((b) => (b._id === banner._id ? { ...b, status: next } : b)),
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update status"));
    }
  };

  /* -------------------------------------------------------------- DELETE */
  const closeDeleteModal = () => {
    setModalOpen(false);
    setDeleteId(null);
  };

  const handleDeleted = () => {
    if (!deleteId) return;
    setBanners((prev) => prev.filter((b) => b._id !== deleteId));
    if (editingId === deleteId) resetForm();
    closeDeleteModal();
  };

  /* ------------------------------------------------------------- HELPERS */
  const previewImg = imageFile ? imagePreview : form.image;
  const previewBanner = { ...formToBanner(form), image: previewImg };
  const activeCount = banners.filter((b) => b.status === "active").length;

  const colorRow = (
    label: string,
    field: "bg_color" | "accent_color" | "text_color",
    hint: string,
  ) => (
    <div className="space-y-1.5">
      <label className="text-[13px] font-medium text-primary">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={form[field] || THEME_FALLBACK[field]}
          onChange={(e) => set(field, e.target.value)}
          className="border-default h-9 w-12 cursor-pointer rounded-md bg-transparent p-1"
        />
        <span className="flex-1 text-[12px] text-secondary">
          {form[field] || `Theme colour — ${hint}`}
        </span>
        {form[field] ? (
          <button
            type="button"
            onClick={() => set(field, "")}
            className="text-[11px] text-highlight hover:underline"
          >
            Use theme
          </button>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="admin-panel bg-app text-primary min-h-screen p-4 md:p-6">
      {modalOpen && (
        <DeleteModal
          deleteUrl={`/api/v1/banners/${deleteId}`}
          title="Banner"
          onDeleted={handleDeleted}
          closeModal={closeDeleteModal}
        />
      )}

      {/* ---------- মোবাইল হেডার ---------- */}
      <div className="mb-4 flex items-center justify-between xl:hidden">
        <h1 className="text-lg font-semibold text-primary">Hero banners</h1>
        <button
          type="button"
          onClick={() => {
            if (!formOpen && mode === "edit") resetForm();
            setFormOpen((o) => !o);
          }}
          className="btn btn-primary px-4 py-2 text-sm"
        >
          {formOpen ? "Close" : "+ New Banner"}
        </button>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[380px_1fr]">
        {/* ================= LEFT: FORM ================= */}
        <div
          className={`${formOpen ? "block" : "hidden"} bg-card border-default overflow-hidden rounded-xl xl:sticky xl:top-6 xl:block`}
        >
          <div className="border-default-b flex items-center gap-4 px-6 py-5">
            <div
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
              style={{ background: "var(--accent-purple-soft)" }}
            >
              <svg
                className="h-5 w-5 text-accent"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <circle cx="8" cy="10" r="1.5" />
                <path d="M22 16l-5.5-5.5L7 20" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-[16px] font-medium text-primary">
                {mode === "create" ? "Add Banner" : "Edit Banner"}
              </h2>
              <p className="mt-0.5 text-[13px] text-secondary">
                Shows at the top of the home page.
              </p>
            </div>
          </div>

          <div className="space-y-5 px-6 py-6">
            {/* ---- Image ---- */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-primary">
                Banner image <span className="text-muted">(right side)</span>
              </label>
              <div className="flex items-center gap-3">
                <div
                  className="border-default flex h-16 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg"
                  style={{ background: "var(--bg-input)" }}
                >
                  {previewImg ? (
                    <img
                      src={previewImg}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] text-muted">No image</span>
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFilePick}
                    disabled={compressing}
                    className="input-field w-full text-[12px] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--accent-blue-soft)] file:px-3 file:py-1.5 file:text-highlight"
                  />
                  {compressing && (
                    <span className="text-[11px] text-secondary">
                      Optimizing image…
                    </span>
                  )}
                  {previewImg && !compressing && (
                    <button
                      type="button"
                      onClick={clearImage}
                      className="text-[11px] text-danger hover:underline"
                    >
                      Remove image
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ---- Eyebrow ---- */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-primary">
                Small line above title{" "}
                <span className="text-muted">(optional)</span>
              </label>
              <input
                type="text"
                value={form.eyebrow}
                onChange={(e) => set("eyebrow", e.target.value)}
                placeholder="Welcome to Gourmet Bistro"
                className="input-field h-10 w-full px-3 text-[13px]"
              />
            </div>

            {/* ---- Title ---- */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-primary">
                Title <span className="text-danger">*</span>
              </label>
              <textarea
                rows={2}
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder={"Taste the\nAuthentic Flavor"}
                className={`input-field w-full px-3 py-2 text-[14px] ${titleError ? "input-error" : ""}`}
              />
              <p className="text-[11px] text-muted">
                Press Enter to break the headline onto a new line.
              </p>
              {titleError && (
                <p className="text-[12px] text-danger">{titleError}</p>
              )}
            </div>

            {/* ---- Highlight ---- */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-primary">
                Highlighted line{" "}
                <span className="text-muted">(accent colour)</span>
              </label>
              <input
                type="text"
                value={form.highlight}
                onChange={(e) => set("highlight", e.target.value)}
                placeholder="Every single day"
                className="input-field h-10 w-full px-3 text-[13px]"
              />
            </div>

            {/* ---- Subtitle ---- */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-primary">
                Description
              </label>
              <textarea
                rows={3}
                value={form.subtitle}
                onChange={(e) => set("subtitle", e.target.value)}
                placeholder="Experience culinary excellence with our curated menu…"
                className="input-field w-full px-3 py-2 text-[13px]"
              />
            </div>

            {/* ---- Button ---- */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">
                  Button text
                </label>
                <input
                  type="text"
                  value={form.button_label}
                  onChange={(e) => set("button_label", e.target.value)}
                  placeholder="Order Now"
                  className="input-field h-10 w-full px-3 text-[13px]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">
                  Button link
                </label>
                <input
                  type="text"
                  value={form.button_link}
                  onChange={(e) => set("button_link", e.target.value)}
                  placeholder="/foods"
                  className="input-field h-10 w-full px-3 text-[13px]"
                />
              </div>
            </div>

            {/* ---- Colours ---- */}
            <div className="border-default-t space-y-4 pt-5">
              <p className="text-[12px] text-secondary">
                Leave the colours untouched and the banner follows the
                restaurant theme — change the brand colour once and every banner
                changes with it.
              </p>
              {colorRow("Background", "bg_color", "dark ink")}
              {colorRow("Accent (button, arc)", "accent_color", "brand colour")}
              {colorRow("Text", "text_color", "white")}
            </div>

            {/* ---- Order + status ---- */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">
                  Slide order
                </label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => set("sort_order", e.target.value)}
                  className="input-field h-10 w-full px-3 text-[13px]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => set("status", e.target.value as Status)}
                  className="input-field h-10 w-full px-3 text-[13px]"
                >
                  <option value="active" className="bg-elevated text-primary">
                    Active
                  </option>
                  <option value="inactive" className="bg-elevated text-primary">
                    Inactive
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div className="border-default-t flex items-center justify-between px-6 py-4">
            <button
              type="button"
              onClick={resetForm}
              className="btn btn-outline px-5 py-2 text-[13px]"
            >
              {mode === "edit" ? "Cancel" : "Reset"}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || compressing}
              className="btn btn-primary px-6 py-2 text-[13px]"
            >
              {submitting
                ? "Saving…"
                : mode === "create"
                  ? "Create Banner"
                  : "Update Banner"}
            </button>
          </div>
        </div>

        {/* ================= RIGHT: PREVIEW + LIST ================= */}
        <div className="space-y-6">
          {/* ---- Live preview ---- */}
          <div className="bg-card border-default overflow-hidden rounded-xl">
            <div className="border-default-b flex flex-wrap items-center justify-between gap-2 px-5 py-3">
              <h3 className="text-[14px] font-medium text-primary">
                Live preview
              </h3>
              <p className="text-[12px] text-secondary">
                Exactly what the home page will render.
              </p>
            </div>
            <HeroBannerSlide banner={previewBanner} />
          </div>

          {/* ---- List ---- */}
          <div className="bg-card border-default overflow-hidden rounded-xl">
            <div className="border-default-b flex flex-wrap items-center justify-between gap-2 px-5 py-3">
              <h3 className="text-[14px] font-medium text-primary">
                All banners{" "}
                <span className="text-secondary">({banners.length})</span>
              </h3>
              <p className="text-[12px] text-secondary">
                {activeCount > 1
                  ? `${activeCount} active — the home page slides through them every 5 seconds.`
                  : activeCount === 1
                    ? "1 active — shown as a single static banner."
                    : "Nothing active — the home page hides the banner section."}
              </p>
            </div>

            <div className="p-4 md:p-5">
              {loading ? (
                <p className="p-2 text-sm text-secondary">Loading…</p>
              ) : banners.length === 0 ? (
                <p className="p-2 text-sm text-secondary">
                  No banners yet. Create your first one.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                  {banners.map((banner) => (
                    <div
                      key={banner._id}
                      className={`bg-elevated border-default flex flex-col overflow-hidden rounded-lg ${
                        editingId === banner._id ? "outline outline-1" : ""
                      }`}
                      style={
                        editingId === banner._id
                          ? { outlineColor: "var(--accent-blue)" }
                          : undefined
                      }
                    >
                      <div
                        className="relative aspect-[16/7] w-full"
                        style={{
                          background: banner.bg_color || "var(--bg-input)",
                        }}
                      >
                        {banner.image ? (
                          <img
                            src={banner.image}
                            alt={banner.title}
                            className="absolute inset-0 h-full w-full object-cover opacity-70"
                          />
                        ) : null}
                        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 to-transparent p-3">
                          <p className="clamp-2 text-[13px] font-semibold text-white">
                            {banner.title}
                          </p>
                        </div>
                        <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
                          #{banner.sort_order ?? 0}
                        </span>
                      </div>

                      <div className="flex flex-1 flex-col gap-2 p-3">
                        <p className="clamp-2 text-[12px] text-secondary">
                          {banner.subtitle || "No description"}
                        </p>

                        <button
                          type="button"
                          onClick={() => toggleStatus(banner)}
                          className={`self-start rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                            banner.status === "active"
                              ? "text-success"
                              : "text-danger"
                          }`}
                          style={{
                            borderColor: "var(--border-color)",
                            background:
                              banner.status === "active"
                                ? "var(--accent-green-soft)"
                                : "var(--accent-red-soft)",
                          }}
                        >
                          {banner.status === "active" ? "Active" : "Inactive"}
                        </button>

                        <div className="mt-auto flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(banner)}
                            className="btn btn-blue flex-1 py-1.5 text-[11px]"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setModalOpen(true);
                              setDeleteId(banner._id);
                            }}
                            className="btn btn-danger flex-1 py-1.5 text-[11px]"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BannerManager;
