/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

/**
 * Banners  (Restaurant promo banners)
 * ------------------------------------
 * One page: left = create/edit form (with live preview), right = banner grid.
 * Every content field is OPTIONAL — you can save a banner with just an
 * image, just text, or any mix. Two images are supported:
 *   - main_bg_image : full-bleed background of the banner
 *   - food_image    : foreground food photo placed on top of the bg
 *
 * Uses the /api/v1/upload route you already have (Cloudinary, with a
 * base64 fallback baked into that route) for both images independently,
 * and deletes the old Cloudinary asset whenever an image is replaced.
 *
 * Expected API (adjust to match your backend):
 *   GET    /api/v1/banners        -> { success, data: Banner[] }
 *   POST   /api/v1/banners        -> create
 *   PATCH  /api/v1/banners/:id    -> update
 *   DELETE /api/v1/banners/:id    -> handled by DeleteModal
 *   POST   /api/v1/upload         -> { url, public_id }   (already built)
 *   DELETE /api/v1/upload         -> { public_id }         (already built)
 *
 * Adjust the import paths below to match your project structure.
 */

import { useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import DeleteModal from "@/src/app/Layout/DeleteModal/DeleteModal";
import { AuthContext } from "@/src/app/dashboard/AuthProvider";
import { toast } from "react-toastify";

type TextColor = "light" | "dark";
type Status = "active" | "inactive";

interface Banner {
  _id: string;
  main_bg_image?: string;
  main_bg_image_public_id?: string;
  food_image?: string;
  food_image_public_id?: string;
  text_title?: string;
  subtitle?: string;
  price_offer?: string;
  badge_text?: string;
  button_text?: string;
  button_link?: string;
  text_color?: TextColor;
  sort_order?: number;
  status?: Status;
  createdAt?: string;
  [key: string]: any;
}

interface FormData {
  main_bg_image: string;
  main_bg_image_public_id: string;
  food_image: string;
  food_image_public_id: string;
  text_title: string;
  subtitle: string;
  price_offer: string;
  badge_text: string;
  button_text: string;
  button_link: string;
  text_color: TextColor;
  sort_order: string;
  status: Status;
}

const EMPTY_FORM: FormData = {
  main_bg_image: "",
  main_bg_image_public_id: "",
  food_image: "",
  food_image_public_id: "",
  text_title: "",
  subtitle: "",
  price_offer: "",
  badge_text: "",
  button_text: "",
  button_link: "",
  text_color: "light",
  sort_order: "0",
  status: "active",
};

const Banners = () => {
  const { token } = useContext(AuthContext);

  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formOpen, setFormOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // pending (not-yet-uploaded) image files + local previews
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [bgPreview, setBgPreview] = useState<string>("");
  const [foodFile, setFoodFile] = useState<File | null>(null);
  const [foodPreview, setFoodPreview] = useState<string>("");

  const bgInputRef = useRef<HTMLInputElement>(null);
  const foodInputRef = useRef<HTMLInputElement>(null);

  const fetchBanners = async () => {
    try {
      const res = await axios.get(`/api/v1/banners`, {
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

  // ----------------------------------------------------------------
  // FORM HELPERS
  // ----------------------------------------------------------------
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setMode("create");
    setEditingId(null);
    setBgFile(null);
    setBgPreview("");
    setFoodFile(null);
    setFoodPreview("");
    if (bgInputRef.current) bgInputRef.current.value = "";
    if (foodInputRef.current) foodInputRef.current.value = "";
  };

  const startEdit = (banner: Banner) => {
    setForm({
      main_bg_image: banner.main_bg_image || "",
      main_bg_image_public_id: banner.main_bg_image_public_id || "",
      food_image: banner.food_image || "",
      food_image_public_id: banner.food_image_public_id || "",
      text_title: banner.text_title || "",
      subtitle: banner.subtitle || "",
      price_offer: banner.price_offer || "",
      badge_text: banner.badge_text || "",
      button_text: banner.button_text || "",
      button_link: banner.button_link || "",
      text_color: banner.text_color || "light",
      sort_order: String(banner.sort_order ?? 0),
      status: banner.status || "active",
    });
    setBgFile(null);
    setBgPreview("");
    setFoodFile(null);
    setFoodPreview("");
    setMode("edit");
    setEditingId(banner._id);
    setFormOpen(true);
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFilePick = (
    e: React.ChangeEvent<HTMLInputElement>,
    which: "bg" | "food"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }
    const localUrl = URL.createObjectURL(file);
    if (which === "bg") {
      setBgFile(file);
      setBgPreview(localUrl);
    } else {
      setFoodFile(file);
      setFoodPreview(localUrl);
    }
  };

  const deleteOldImage = async (publicId: string) => {
    if (!publicId) return;
    try {
      await axios.delete("/api/v1/upload", { data: { public_id: publicId } });
    } catch (err) {
      console.error("Old image delete error:", err);
    }
  };

  // clear an image (remove from banner, delete from Cloudinary if it was already uploaded)
  const clearImage = async (which: "bg" | "food") => {
    if (which === "bg") {
      if (form.main_bg_image_public_id) await deleteOldImage(form.main_bg_image_public_id);
      setForm((prev) => ({ ...prev, main_bg_image: "", main_bg_image_public_id: "" }));
      setBgFile(null);
      setBgPreview("");
      if (bgInputRef.current) bgInputRef.current.value = "";
    } else {
      if (form.food_image_public_id) await deleteOldImage(form.food_image_public_id);
      setForm((prev) => ({ ...prev, food_image: "", food_image_public_id: "" }));
      setFoodFile(null);
      setFoodPreview("");
      if (foodInputRef.current) foodInputRef.current.value = "";
    }
  };

  // Generic single-image uploader — reused for bg + food image.
  const uploadImage = async (
    file: File | null,
    existingUrl: string,
    existingPublicId: string
  ): Promise<{ url: string; public_id: string }> => {
    if (!file) {
      return { url: existingUrl, public_id: existingPublicId };
    }
    const fd = new FormData();
    fd.append("file", file);

    // Content-Type header manually সেট করা হয় না —
    // axios/browser নিজেই boundary সহ সঠিক multipart Content-Type বসিয়ে দেয়
    const res = await axios.post("/api/v1/upload", fd);
    const { url, public_id } = res.data;

    if (mode === "edit" && existingPublicId) {
      await deleteOldImage(existingPublicId);
    }
    return { url, public_id };
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setUploadingImage(true);
    try {
      const bgResult = await uploadImage(
        bgFile,
        form.main_bg_image,
        form.main_bg_image_public_id
      );
      const foodResult = await uploadImage(
        foodFile,
        form.food_image,
        form.food_image_public_id
      );

      const payload = {
        ...form,
        main_bg_image: bgResult.url,
        main_bg_image_public_id: bgResult.public_id,
        food_image: foodResult.url,
        food_image_public_id: foodResult.public_id,
        sort_order: Number(form.sort_order) || 0,
      };

      if (mode === "create") {
        const res = await axios.post(`/api/v1/banners`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          toast.success("Banner created successfully!");
          resetForm();
          fetchBanners();
          setFormOpen(false);
        } else {
          toast.error(res.data.message || "Something went wrong.");
        }
      } else {
        const res = await axios.patch(`/api/v1/banners/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          toast.success("Banner updated successfully!");
          resetForm();
          fetchBanners();
          setFormOpen(false);
        } else {
          toast.error(res.data.message || "Update failed.");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save banner.");
    } finally {
      setSubmitting(false);
      setUploadingImage(false);
    }
  };

  const toggleStatus = async (banner: Banner) => {
    const nextStatus: Status = banner.status === "active" ? "inactive" : "active";
    try {
      const res = await axios.patch(
        `/api/v1/banners/${banner._id}`,
        { status: nextStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setBanners((prev) =>
          prev.map((b) => (b._id === banner._id ? { ...b, status: nextStatus } : b))
        );
      }
    } catch {
      toast.error("Failed to update status.");
    }
  };

  // ----------------------------------------------------------------
  // DELETE
  // ----------------------------------------------------------------
  const closeDeleteModal = (): void => {
    setModalOpen(false);
    setDeleteId(null);
  };

  const handleDeleted = (): void => {
    if (!deleteId) return;
    setBanners((prev) => prev.filter((b) => b._id !== deleteId));
    if (editingId === deleteId) resetForm();
    closeDeleteModal();
  };

  const previewBg = bgFile ? bgPreview : form.main_bg_image;
  const previewFood = foodFile ? foodPreview : form.food_image;
  const previewTextClass = form.text_color === "dark" ? "text-slate-900" : "text-white";

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

      {/* Mobile header + toggle */}
      <div className="flex items-center justify-between mb-4 lg:hidden">
        <h1 className="text-lg font-semibold text-primary">Banners</h1>
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

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 items-start">
        {/* ============== LEFT: CREATE / EDIT FORM ============== */}
        <div
          className={`${formOpen ? "block" : "hidden"} lg:block bg-card border-default rounded-xl overflow-hidden lg:sticky lg:top-6`}
        >
          {/* Header */}
          <div className="flex items-center gap-4 px-6 py-5 border-default-b">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--accent-blue-soft)" }}
            >
              <svg className="w-5 h-5 text-highlight" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="14" rx="2" />
                <path d="M3 15l5-5 4 4 5-6 4 5" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-[16px] font-medium text-primary">
                {mode === "create" ? "Add Banner" : "Edit Banner"}
              </h2>
              <p className="text-[13px] text-secondary mt-0.5">
                All fields are optional — fill in what you need.
              </p>
            </div>
          </div>

          {/* Live preview */}
          <div className="px-6 pt-5">
            <p className="text-[12px] text-secondary mb-2">Preview</p>
            <div
              className="relative w-full aspect-[16/7] rounded-lg overflow-hidden border-default"
              style={{ background: "var(--bg-elevated)" }}
            >
              {previewBg && (
                <img
                  src={previewBg}
                  alt="Background"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-black/10" />

              {previewFood && (
                <img
                  src={previewFood}
                  alt="Food"
                  className="absolute right-2 bottom-0 h-[85%] object-contain drop-shadow-2xl"
                />
              )}

              <div className="relative z-10 h-full flex flex-col justify-center px-4 py-3 max-w-[65%]">
                {form.badge_text && (
                  <span
                    className="inline-block w-fit px-2 py-0.5 rounded-full text-[10px] font-semibold mb-1"
                    style={{ background: "var(--accent-orange)", color: "#141b2d" }}
                  >
                    {form.badge_text}
                  </span>
                )}
                {form.text_title && (
                  <h3 className={`text-[15px] sm:text-lg font-bold leading-tight ${previewTextClass}`}>
                    {form.text_title}
                  </h3>
                )}
                {form.subtitle && (
                  <p className={`text-[11px] sm:text-xs mt-1 ${previewTextClass} opacity-90`}>
                    {form.subtitle}
                  </p>
                )}
                {form.price_offer && (
                  <p className={`text-sm sm:text-base font-extrabold mt-1 ${previewTextClass}`}>
                    {form.price_offer}
                  </p>
                )}
                {form.button_text && (
                  <span className="btn btn-primary w-fit mt-2 px-3 py-1 text-[11px]">
                    {form.button_text}
                  </span>
                )}
              </div>

              {!previewBg && !previewFood && !form.text_title && (
                <div className="absolute inset-0 flex items-center justify-center text-muted text-[12px]">
                  Nothing to preview yet
                </div>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-5">
            {/* Background image */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-primary">
                Background Image <span className="text-muted">(optional)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  ref={bgInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFilePick(e, "bg")}
                  className="input-field flex-1 text-[13px] file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-[var(--accent-blue-soft)] file:text-highlight"
                />
                {(previewBg) && (
                  <button type="button" onClick={() => clearImage("bg")} className="btn btn-outline px-3 py-2 text-[12px]">
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Food image */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-primary">
                Food Image <span className="text-muted">(optional)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  ref={foodInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFilePick(e, "food")}
                  className="input-field flex-1 text-[13px] file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-[var(--accent-blue-soft)] file:text-highlight"
                />
                {(previewFood) && (
                  <button type="button" onClick={() => clearImage("food")} className="btn btn-outline px-3 py-2 text-[12px]">
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-primary">
                Title <span className="text-muted">(optional)</span>
              </label>
              <input
                type="text"
                value={form.text_title}
                onChange={(e) => handleChange("text_title", e.target.value)}
                placeholder="Weekend Special Combo"
                className="input-field w-full h-10 px-3 text-[14px]"
              />
            </div>

            {/* Subtitle */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-primary">
                Subtitle <span className="text-muted">(optional)</span>
              </label>
              <input
                type="text"
                value={form.subtitle}
                onChange={(e) => handleChange("subtitle", e.target.value)}
                placeholder="Only this Friday & Saturday"
                className="input-field w-full h-10 px-3 text-[14px]"
              />
            </div>

            {/* Price / offer + Badge */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">
                  Price / Offer <span className="text-muted">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.price_offer}
                  onChange={(e) => handleChange("price_offer", e.target.value)}
                  placeholder="৳299 or 30% OFF"
                  className="input-field w-full h-10 px-3 text-[14px]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">
                  Badge Text <span className="text-muted">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.badge_text}
                  onChange={(e) => handleChange("badge_text", e.target.value)}
                  placeholder="Limited Time"
                  className="input-field w-full h-10 px-3 text-[14px]"
                />
              </div>
            </div>

            {/* Button text + link */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">
                  Button Text <span className="text-muted">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.button_text}
                  onChange={(e) => handleChange("button_text", e.target.value)}
                  placeholder="Order Now"
                  className="input-field w-full h-10 px-3 text-[14px]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">
                  Button Link <span className="text-muted">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.button_link}
                  onChange={(e) => handleChange("button_link", e.target.value)}
                  placeholder="/menu/combo"
                  className="input-field w-full h-10 px-3 text-[14px]"
                />
              </div>
            </div>

            {/* Text color + Sort order + Status */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">Text Color</label>
                <select
                  value={form.text_color}
                  onChange={(e) => handleChange("text_color", e.target.value)}
                  className="input-field w-full h-10 px-2 text-[13px]"
                >
                  <option value="light" className="bg-elevated text-primary">Light</option>
                  <option value="dark" className="bg-elevated text-primary">Dark</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">Order</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => handleChange("sort_order", e.target.value)}
                  className="input-field w-full h-10 px-2 text-[13px]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  className="input-field w-full h-10 px-2 text-[13px]"
                >
                  <option value="active" className="bg-elevated text-primary">Active</option>
                  <option value="inactive" className="bg-elevated text-primary">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-default-t">
            <button type="button" onClick={resetForm} className="btn btn-outline px-5 py-2 text-[13px]">
              {mode === "edit" ? "Cancel" : "Reset"}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || uploadingImage}
              className="btn btn-primary flex items-center gap-2 px-6 py-2 text-[13px]"
            >
              {submitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  {uploadingImage ? "Uploading..." : mode === "create" ? "Creating..." : "Updating..."}
                </>
              ) : (
                <>{mode === "create" ? "Create Banner" : "Update Banner"}</>
              )}
            </button>
          </div>
        </div>

        {/* ============== RIGHT: BANNER GRID ============== */}
        <div className="bg-card border-default rounded-xl overflow-hidden p-4 md:p-5">
          {loading ? (
            <p className="text-secondary text-sm p-2">Loading...</p>
          ) : banners.length === 0 ? (
            <p className="text-secondary text-sm p-2">No banners yet. Create your first one.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {banners
                .slice()
                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                .map((banner) => {
                  const textClass = banner.text_color === "dark" ? "text-slate-900" : "text-white";
                  return (
                    <div
                      key={banner._id}
                      className={`bg-elevated border-default rounded-lg overflow-hidden flex flex-col ${
                        editingId === banner._id ? "outline outline-1" : ""
                      }`}
                      style={editingId === banner._id ? { outlineColor: "var(--accent-blue)" } : undefined}
                    >
                      <div className="relative w-full aspect-[16/7]" style={{ background: "var(--bg-input)" }}>
                        {banner.main_bg_image && (
                          <img src={banner.main_bg_image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-black/10" />
                        {banner.food_image && (
                          <img
                            src={banner.food_image}
                            alt=""
                            className="absolute right-1 bottom-0 h-[85%] object-contain drop-shadow-xl"
                          />
                        )}
                        <div className="relative z-10 h-full flex flex-col justify-center px-3 py-2 max-w-[65%]">
                          {banner.badge_text && (
                            <span
                              className="inline-block w-fit px-2 py-0.5 rounded-full text-[9px] font-semibold mb-1"
                              style={{ background: "var(--accent-orange)", color: "#141b2d" }}
                            >
                              {banner.badge_text}
                            </span>
                          )}
                          {banner.text_title && (
                            <h4 className={`text-[13px] font-bold leading-tight ${textClass}`}>{banner.text_title}</h4>
                          )}
                          {banner.price_offer && (
                            <p className={`text-[12px] font-extrabold ${textClass}`}>{banner.price_offer}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between px-3 py-2.5 gap-2">
                        <button
                          type="button"
                          onClick={() => toggleStatus(banner)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                            banner.status === "active" ? "text-success" : "text-danger"
                          }`}
                          style={{
                            borderColor: "var(--border-color)",
                            background:
                              banner.status === "active"
                                ? "var(--accent-green-soft)"
                                : "rgba(239,68,68,0.12)",
                          }}
                        >
                          {banner.status === "active" ? "Active" : "Inactive"}
                        </button>

                        <div className="flex gap-2">
                          <button type="button" onClick={() => startEdit(banner)} className="btn btn-blue px-3 py-1.5 text-[12px]">
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
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Banners;