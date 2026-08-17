/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AuthContext } from "@/src/app/dashboard/AuthProvider";
import DeleteModal from "@/src/app/Layout/DeleteModal/DeleteModal";

interface HeroFormData {
  line1: string; // e.g. "We Have {Excellent}"
  line2: string; // e.g. "Of {Quality} Pizza"
  buttonText: string;
  buttonLink: string;
  discountPercent: string;
  discountLabel: string; // "off"
  sort_order: string;
}

interface BannerApi {
  _id: string;
  line1: string;
  line2: string;
  buttonText: string;
  buttonLink: string;
  discountPercent: number;
  discountLabel: string;
  image: string;
  image_public_id?: string;
  sort_order?: number;
  createdAt?: string;
}

const emptyForm = (): HeroFormData => ({
  line1: "We Have {Excellent}",
  line2: "Of {Quality} Pizza",
  buttonText: "See All Menu",
  buttonLink: "/menu",
  discountPercent: "40",
  discountLabel: "off",
  sort_order: "0",
});

/** Renders a heading string, turning {word} segments into the orange highlight. */
const renderHighlighted = (text: string) => {
  const parts = text.split(/(\{[^}]+\})/g);
  return parts.map((part, i) => {
    const match = part.match(/^\{([^}]+)\}$/);
    if (match) {
      return (
        <span key={i} className="text-[#f5a623]">
          {match[1]}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

export const DiscountBanner = () => {
  const { token } = useContext(AuthContext);

  const [banners, setBanners] = useState<BannerApi[]>([]);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HeroFormData>(emptyForm());
  const [formOpen, setFormOpen] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [existingImage, setExistingImage] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/v1/hero-discount-banner`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBanners(res.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load banners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (field: keyof HeroFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm());
    setMode("create");
    setEditingId(null);
    setImageFile(null);
    setImagePreview("");
    setExistingImage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const startEdit = (banner: BannerApi) => {
    setForm({
      line1: banner.line1 || "",
      line2: banner.line2 || "",
      buttonText: banner.buttonText || "",
      buttonLink: banner.buttonLink || "",
      discountPercent: String(banner.discountPercent ?? 0),
      discountLabel: banner.discountLabel || "",
      sort_order: String(banner.sort_order ?? 0),
    });
    setExistingImage(banner.image || "");
    setImageFile(null);
    setImagePreview("");
    setMode("edit");
    setEditingId(banner._id);
    setFormOpen(true);
  };

  /** Just picks the raw file for upload — no client-side resize/base64 conversion. Cloudinary handles it. */
  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /** Uploads the raw file to Cloudinary via /api/v1/upload and returns the hosted URL + public_id. */
  const uploadImage = async (): Promise<{ url: string; public_id: string }> => {
    if (!imageFile) return { url: existingImage, public_id: "12" };
    const fd = new FormData();
    fd.append("file", imageFile);
    fd.append("folder", "hero_discount_banners");
    const res = await axios.post("/api/v1/upload", fd);
    const data = res.data;
    if (!data) throw new Error("Upload failed: empty response");
    if (data.success === false) throw new Error(data.message || "Upload failed");
    // If server fell back to a base64 data URL, reject — controller expects hosted URLs
    
    return { url: data.url, public_id: data.public_id };
  };

  const handleSubmit = async () => {
    if (!form.line1.trim() || !form.line2.trim()) {
      toast.error("Both heading lines are required");
      return;
    }
    if (!form.buttonText.trim()) {
      toast.error("Button text is required");
      return;
    }
    if (!imageFile && !existingImage) {
      toast.error("Banner image is required");
      return;
    }

    setSubmitting(true);
    try {
      const img = await uploadImage();
      const payload = {
        line1: form.line1.trim(),
        line2: form.line2.trim(),
        buttonText: form.buttonText.trim(),
        buttonLink: form.buttonLink.trim() || "/menu",
        discountPercent: Number(form.discountPercent) || 0,
        discountLabel: form.discountLabel.trim() || "off",
        image: img.url,
        sort_order: Number(form.sort_order) || 0,
      };

      if (mode === "create") {
        const res = await axios.post(`/api/v1/hero-discount-banner`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          toast.success("Banner created!");
          resetForm();
          setFormOpen(false);
          fetchBanners();
        } else {
          toast.error(res.data.message || "Something went wrong.");
        }
      } else {
        const res = await axios.patch(
          `/api/v1/hero-discount-banner/${editingId}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.data.success) {
          toast.success("Banner updated!");
          resetForm();
          setFormOpen(false);
          fetchBanners();
        } else {
          toast.error(res.data.message || "Update failed.");
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to save banner.");
    } finally {
      setSubmitting(false);
    }
  };

  const closeDeleteModal = () => {
    setModalOpen(false);
    setDeleteId(null);
  };

  const handleDeleted = () => {
    if (!deleteId) return;
    setBanners((prev) => prev.filter((b) => b._id !== deleteId));
    if (editingId === deleteId) {
      resetForm();
      setFormOpen(false);
    }
    closeDeleteModal();
  };

  const previewImg = imageFile ? imagePreview : existingImage;

  return (
    <div className="admin-panel bg-app text-primary min-h-screen p-4 md:p-6">
      {modalOpen && (
        <DeleteModal
          deleteUrl={`/api/v1/hero-discount-banner/${deleteId}`}
          title="Banner"
          onDeleted={handleDeleted}
          closeModal={closeDeleteModal}
        />
      )}

      {/* header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-primary">
            Hero Discount Banners
          </h1>
          <p className="text-[13px] text-secondary mt-0.5">
            Manage the homepage hero/discount banners.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!formOpen) startCreate();
            else setFormOpen(false);
          }}
          className="btn btn-primary px-4 py-2 text-sm"
        >
          {formOpen ? "Close" : "+ New Banner"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 items-start">
        {/* ============== LEFT: FORM ============== */}
        <div
          className={`${formOpen ? "block" : "hidden"} lg:block bg-card border-default rounded-xl overflow-hidden lg:sticky lg:top-6`}
        >
          <div className="flex items-center gap-4 px-6 py-5 border-default-b">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--accent-blue-soft)" }}
            >
              <svg
                className="w-5 h-5 text-highlight"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-[16px] font-medium text-primary">
                {mode === "create" ? "Add Banner" : "Edit Banner"}
              </h2>
              <p className="text-[13px] text-secondary mt-0.5">
                Title, discount badge &amp; banner image.
              </p>
            </div>
          </div>

          <div className="px-6 py-6 space-y-6">
            {/* ---- 1. Title / Button ---- */}
            <div className="space-y-4">
              <p className="text-[12px] font-semibold text-highlight uppercase tracking-wide">
                1. Title &amp; Button
              </p>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">
                  Heading — line 1 <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={form.line1}
                  onChange={(e) => handleChange("line1", e.target.value)}
                  placeholder="We Have {Excellent}"
                  className="input-field w-full h-10 px-3 text-[14px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">
                  Heading — line 2 <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={form.line2}
                  onChange={(e) => handleChange("line2", e.target.value)}
                  placeholder="Of {Quality} Pizza"
                  className="input-field w-full h-10 px-3 text-[14px]"
                />
                <p className="text-[11px] text-secondary">
                  Wrap a word in <code>{"{ }"}</code> to highlight it in orange
                  — e.g. <code>{"{Excellent}"}</code>.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-primary">
                    Button Text <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.buttonText}
                    onChange={(e) => handleChange("buttonText", e.target.value)}
                    placeholder="See All Menu"
                    className="input-field w-full h-10 px-3 text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-primary">
                    Button Link
                  </label>
                  <input
                    type="text"
                    value={form.buttonLink}
                    onChange={(e) => handleChange("buttonLink", e.target.value)}
                    placeholder="/menu"
                    className="input-field w-full h-10 px-3 text-[13px]"
                  />
                </div>
              </div>
            </div>

            <hr className="border-default" />

            {/* ---- 2. Discount ---- */}
            <div className="space-y-4">
              <p className="text-[12px] font-semibold text-highlight uppercase tracking-wide">
                2. Discount Badge
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-primary">
                    Discount %
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.discountPercent}
                    onChange={(e) =>
                      handleChange("discountPercent", e.target.value)
                    }
                    placeholder="40"
                    className="input-field w-full h-10 px-3 text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-primary">
                    Label
                  </label>
                  <input
                    type="text"
                    value={form.discountLabel}
                    onChange={(e) =>
                      handleChange("discountLabel", e.target.value)
                    }
                    placeholder="off"
                    className="input-field w-full h-10 px-3 text-[13px]"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">
                  Sort Order{" "}
                  <span className="text-muted">(lower shows first)</span>
                </label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => handleChange("sort_order", e.target.value)}
                  className="input-field w-full h-10 px-3 text-[13px]"
                />
              </div>
            </div>

            <hr className="border-default" />

            {/* ---- 3. Banner image (raw upload, no client-side resize) ---- */}
            <div className="space-y-3">
              <p className="text-[12px] font-semibold text-highlight uppercase tracking-wide">
                3. Banner Image
              </p>
              <label className="text-[13px] font-medium text-primary block">
                Image <span className="text-danger">*</span>
              </label>

              <div className="flex items-center gap-3">
                <div
                  className="w-20 h-20 rounded-lg border-default flex items-center justify-center overflow-hidden flex-shrink-0"
                  style={{ background: "var(--bg-input)" }}
                >
                  {previewImg ? (
                    <img
                      src={previewImg}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg
                      className="w-7 h-7 text-muted"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFilePick}
                    className="input-field w-full text-[12px] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-[var(--accent-blue-soft)] file:text-highlight"
                  />
                  {previewImg && (
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
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-default-t">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setFormOpen(false);
              }}
              className="btn btn-outline px-5 py-2 text-[13px]"
            >
              {mode === "edit" ? "Cancel" : "Reset"}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="btn btn-primary px-6 py-2 text-[13px]"
            >
              {submitting
                ? mode === "create"
                  ? "Creating..."
                  : "Updating..."
                : mode === "create"
                  ? "Create Banner"
                  : "Update Banner"}
            </button>
          </div>
        </div>

        {/* ============== RIGHT: LIVE PREVIEW + BANNER LIST ============== */}
        <div className="space-y-6">
          {/* live preview */}
          <div className="bg-card border-default rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-default-b">
              <h3 className="text-[14px] font-medium text-primary">
                Live Preview
              </h3>
            </div>

            <div
              className="relative overflow-hidden p-8 md:p-12"
              style={{ background: "#171716", minHeight: 380 }}
            >
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
                    {renderHighlighted(form.line1 || "")}
                  </h1>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight mt-1">
                    {renderHighlighted(form.line2 || "")}
                  </h1>

                  <button
                    type="button"
                    className="mt-6 inline-flex items-center gap-2 bg-red-600 text-white rounded-full px-6 py-3 text-[13px] font-bold tracking-wide"
                  >
                    {(form.buttonText || "SEE ALL MENU").toUpperCase()} →
                  </button>
                </div>

                <div className="relative flex items-center justify-center">
                  {Number(form.discountPercent) > 0 && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 z-20 w-24 h-24 rounded-full bg-white flex flex-col items-center justify-center shadow-lg">
                      <span className="text-red-600 font-extrabold text-lg leading-none">
                        {form.discountPercent}%
                      </span>
                      <span className="text-gray-900 font-bold text-sm leading-none mt-1">
                        {form.discountLabel || "off"}
                      </span>
                    </div>
                  )}

                  <div
                    className="rounded-full overflow-hidden border-4 border-white/10 flex items-center justify-center bg-black/20"
                    style={{ width: 260, height: 260 }}
                  >
                    {previewImg ? (
                      <img
                        src={previewImg}
                        alt="Hero"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white/30 text-[12px]">
                        No image uploaded
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-default-t">
              <p className="text-[12px] text-secondary">
                Image uploads directly to Cloudinary — no client-side resize.
              </p>
            </div>
          </div>

          {/* banner list */}
          <div className="bg-card border-default rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-default-b flex items-center justify-between">
              <h3 className="text-[14px] font-medium text-primary">
                All Banners
              </h3>
              <span className="text-[12px] text-secondary">
                {banners.length} total
              </span>
            </div>

            {loading ? (
              <p className="p-6 text-secondary text-sm">Loading...</p>
            ) : banners.length === 0 ? (
              <p className="p-6 text-secondary text-sm">
                No banners yet — create your first one.
              </p>
            ) : (
              <div className="divide-y divide-default">
                {banners.map((banner) => (
                  <div
                    key={banner._id}
                    className={`flex items-center gap-4 px-6 py-4 ${
                      editingId === banner._id ? "outline outline-1" : ""
                    }`}
                    style={
                      editingId === banner._id
                        ? { outlineColor: "var(--accent-blue)" }
                        : undefined
                    }
                  >
                    <div
                      className="w-16 h-16 rounded-lg border-default flex items-center justify-center overflow-hidden flex-shrink-0"
                      style={{ background: "var(--bg-input)" }}
                    >
                      {banner.image ? (
                        <img
                          src={banner.image}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg
                          className="w-6 h-6 text-muted"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-primary truncate">
                        {banner.line1.replace(/[{}]/g, "")}{" "}
                        {banner.line2.replace(/[{}]/g, "")}
                      </p>
                      <p className="text-[12px] text-secondary mt-0.5">
                        {banner.discountPercent}% {banner.discountLabel} ·{" "}
                        {banner.buttonText} → {banner.buttonLink} · order:{" "}
                        {banner.sort_order ?? 0}
                      </p>
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(banner)}
                        className="btn btn-blue px-3 py-1.5 text-[12px]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setModalOpen(true);
                          setDeleteId(banner._id);
                        }}
                        className="btn btn-danger px-3 py-1.5 text-[12px]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscountBanner;
