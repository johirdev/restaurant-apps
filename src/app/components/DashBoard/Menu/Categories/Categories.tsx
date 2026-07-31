/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

/**
 * Categories  (Food categories)
 * -------------------------------
 * Left: create/edit form (with live preview). Right: category grid.
 *
 * Image handling: whatever the user picks — 5MB, 20MB, huge phone photo —
 * gets resized + re-encoded client-side via compressImage() BEFORE it's
 * sent to /api/v1/upload. That keeps both pixel dimensions and file size
 * under control regardless of what the user uploads.
 *
 * Expected API (adjust to match your backend):
 *   GET    /api/v1/categories        -> { success, data: Category[] }
 *   POST   /api/v1/categories        -> create
 *   PATCH  /api/v1/categories/:id    -> update
 *   DELETE /api/v1/categories/:id    -> handled by DeleteModal
 *   POST   /api/v1/upload            -> { url, public_id }
 *   DELETE /api/v1/upload            -> { public_id }
 *
 * Adjust the import paths below to match your project structure.
 */

import { useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import DeleteModal from "@/src/app/Layout/DeleteModal/DeleteModal";
import { AuthContext } from "@/src/app/dashboard/AuthProvider";

import { toast } from "react-toastify";
import { compressImage } from "@/src/app/Layout/Compressimage/Compressimage";

type SubTitle = "" | "New" | "Hot" | "Popular";
type Status = "active" | "inactive";

interface Category {
  _id: string;
  image?: string;
  image_public_id?: string;
  name: string;
  sub_title?: SubTitle;
  slug?: string;
  sort_order?: number;
  status?: Status;
  createdAt?: string;
  [key: string]: any;
}

interface FormData {
  image: string;
  image_public_id: string;
  name: string;
  sub_title: SubTitle;
  slug: string;
  sort_order: string;
  status: Status;
}

interface FormErrors {
  name?: string;
}

const SUB_TITLE_OPTIONS: SubTitle[] = ["", "New", "Hot", "Popular"];

const EMPTY_FORM: FormData = {
  image: "",
  image_public_id: "",
  name: "",
  sub_title: "",
  slug: "",
  sort_order: "0",
  status: "active",
};

const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const Categories = () => {
  const { token } = useContext(AuthContext);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [compressing, setCompressing] = useState(false);

  const [formOpen, setFormOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`/api/v1/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories(res.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------------------------------------------------
  // FORM HELPERS
  // ----------------------------------------------------------------
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setMode("create");
    setEditingId(null);
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startEdit = (category: Category) => {
    setForm({
      image: category.image || "",
      image_public_id: category.image_public_id || "",
      name: category.name || "",
      sub_title: category.sub_title || "",
      slug: category.slug || "",
      sort_order: String(category.sort_order ?? 0),
      status: category.status || "active",
    });
    setErrors({});
    setImageFile(null);
    setImagePreview("");
    setMode("edit");
    setEditingId(category._id);
    setFormOpen(true);
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "name" && errors.name) {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  };

  // Auto-fill slug from name unless the user already customized it.
  const handleNameChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug:
        prev.slug && prev.slug !== slugify(prev.name)
          ? prev.slug
          : slugify(value),
    }));
    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
  };

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
      // Category thumbnails don't need to be huge — cap at 800x800 / 300KB.
      const compressed = await compressImage(file, {
        maxWidth: 800,
        maxHeight: 800,
        maxSizeKB: 300,
      });
      const finalKB = Math.round(compressed.size / 1024);

      setImageFile(compressed);
      setImagePreview(URL.createObjectURL(compressed));

      if (originalKB > finalKB + 20) {
        toast.info(`Image optimized: ${originalKB}KB → ${finalKB}KB`);
      }
    } catch (err) {
      console.error("Compression failed, using original file:", err);
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } finally {
      setCompressing(false);
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

  const clearImage = async () => {
    if (form.image_public_id) await deleteOldImage(form.image_public_id);
    setForm((prev) => ({ ...prev, image: "", image_public_id: "" }));
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadImage = async (
    file: File | null,
    existingUrl: string,
    existingPublicId: string,
  ): Promise<{ url: string; public_id: string }> => {
    if (!file) {
      return { url: existingUrl, public_id: existingPublicId };
    }
    const fd = new FormData();
    fd.append("file", file);

    const res = await axios.post("/api/v1/upload", fd);
    const { url, public_id } = res.data;

    if (mode === "edit" && existingPublicId) {
      await deleteOldImage(existingPublicId);
    }
    return { url, public_id };
  };

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.name.trim()) errs.name = "Category name is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setUploadingImage(true);
    try {
      const imgResult = await uploadImage(
        imageFile,
        form.image,
        form.image_public_id,
      );

      const payload = {
        ...form,
        image: imgResult.url,
        image_public_id: imgResult.public_id,
        slug: form.slug || slugify(form.name),
        sort_order: Number(form.sort_order) || 0,
      };

      if (mode === "create") {
        const res = await axios.post(`/api/v1/categories`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          toast.success(`Category "${form.name}" created successfully!`);
          resetForm();
          fetchCategories();
          setFormOpen(false);
        } else {
          toast.error(res.data.message || "Something went wrong.");
        }
      } else {
        const res = await axios.patch(
          `/api/v1/categories/${editingId}`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (res.data.success) {
          toast.success("Category updated successfully!");
          resetForm();
          fetchCategories();
          setFormOpen(false);
        } else {
          toast.error(res.data.message || "Update failed.");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save category.");
    } finally {
      setSubmitting(false);
      setUploadingImage(false);
    }
  };

  const toggleStatus = async (category: Category) => {
    const nextStatus: Status =
      category.status === "active" ? "inactive" : "active";
    try {
      const res = await axios.patch(
        `/api/v1/categories/${category._id}`,
        { status: nextStatus },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data.success) {
        setCategories((prev) =>
          prev.map((c) =>
            c._id === category._id ? { ...c, status: nextStatus } : c,
          ),
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
    setCategories((prev) => prev.filter((c) => c._id !== deleteId));
    if (editingId === deleteId) resetForm();
    closeDeleteModal();
  };

  const previewImg = imageFile ? imagePreview : form.image;

  const badgeColor = (sub: SubTitle) => {
    if (sub === "New")
      return { bg: "var(--accent-green-soft)", color: "var(--accent-green)" };
    if (sub === "Hot")
      return { bg: "rgba(239,68,68,0.12)", color: "var(--accent-red)" };
    if (sub === "Popular")
      return { bg: "var(--accent-purple-soft)", color: "#a78bfa" };
    return null;
  };

  return (
    <div className="admin-panel bg-app text-primary min-h-screen p-4 md:p-6">
      {modalOpen && (
        <DeleteModal
          deleteUrl={`/api/v1/categories/${deleteId}`}
          title="Category"
          onDeleted={handleDeleted}
          closeModal={closeDeleteModal}
        />
      )}

      {/* Mobile header + toggle */}
      <div className="flex items-center justify-between mb-4 lg:hidden">
        <h1 className="text-lg font-semibold text-primary">Categories</h1>
        <button
          type="button"
          onClick={() => {
            if (!formOpen && mode === "edit") resetForm();
            setFormOpen((o) => !o);
          }}
          className="btn btn-primary px-4 py-2 text-sm"
        >
          {formOpen ? "Close" : "+ New Category"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
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
              <svg
                className="w-5 h-5 text-highlight"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-[16px] font-medium text-primary">
                {mode === "create" ? "Add Category" : "Edit Category"}
              </h2>
              <p className="text-[13px] text-secondary mt-0.5">
                Large photos are auto-optimized before upload.
              </p>
            </div>
          </div>

          <div className="px-6 py-6 space-y-5">
            {/* Image */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-primary">
                Category Image <span className="text-muted">(optional)</span>
              </label>
              <div className="flex items-center gap-3">
                <div
                  className="w-16 h-16 rounded-lg border-default flex items-center justify-center overflow-hidden flex-shrink-0"
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
                <div className="flex-1 space-y-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFilePick}
                    disabled={compressing}
                    className="input-field w-full text-[12px] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-[var(--accent-blue-soft)] file:text-highlight"
                  />
                  <div className="flex items-center gap-2">
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
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-primary">
                Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Pizza, Burger, Biryani..."
                className={`input-field w-full h-10 px-3 text-[14px] ${errors.name ? "input-error" : ""}`}
              />
              {errors.name && (
                <p className="text-[12px] text-danger">{errors.name}</p>
              )}
            </div>

            {/* Sub title (badge) */}
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-primary">
                Badge <span className="text-muted">(optional)</span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {SUB_TITLE_OPTIONS.map((opt) => {
                  const active = form.sub_title === opt;
                  const colors = badgeColor(opt);
                  return (
                    <button
                      key={opt || "none"}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, sub_title: opt }))
                      }
                      className="role-pill px-3 py-1.5 text-[12px] font-medium"
                      style={
                        active && colors
                          ? {
                              background: colors.bg,
                              color: colors.color,
                              borderColor: colors.color,
                            }
                          : undefined
                      }
                    >
                      {opt || "None"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slug + Sort order */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">
                  Slug <span className="text-muted">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) =>
                    handleChange("slug", slugify(e.target.value))
                  }
                  placeholder="auto from name"
                  className="input-field w-full h-10 px-3 text-[13px]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">
                  Order
                </label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => handleChange("sort_order", e.target.value)}
                  className="input-field w-full h-10 px-3 text-[13px]"
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-primary">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => handleChange("status", e.target.value)}
                className="input-field w-full h-10 px-3 text-[13px]"
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

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-default-t">
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
              disabled={submitting || uploadingImage || compressing}
              className="btn btn-primary flex items-center gap-2 px-6 py-2 text-[13px]"
            >
              {submitting ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  {uploadingImage
                    ? "Uploading..."
                    : mode === "create"
                      ? "Creating..."
                      : "Updating..."}
                </>
              ) : (
                <>{mode === "create" ? "Create Category" : "Update Category"}</>
              )}
            </button>
          </div>
        </div>

        {/* ============== RIGHT: CATEGORY GRID ============== */}
        <div className="bg-card border-default rounded-xl overflow-hidden p-4 md:p-5">
          {loading ? (
            <p className="text-secondary text-sm p-2">Loading...</p>
          ) : categories.length === 0 ? (
            <p className="text-secondary text-sm p-2">
              No categories yet. Create your first one.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {categories
                .slice()
                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                .map((category) => {
                  const colors = badgeColor(category.sub_title || "");
                  return (
                    <div
                      key={category._id}
                      className={`bg-elevated border-default rounded-lg overflow-hidden flex flex-col ${
                        editingId === category._id ? "outline outline-1" : ""
                      }`}
                      style={
                        editingId === category._id
                          ? { outlineColor: "var(--accent-blue)" }
                          : undefined
                      }
                    >
                      <div
                        className="relative w-full aspect-square"
                        style={{ background: "var(--bg-input)" }}
                      >
                        {category.image ? (
                          <img
                            src={category.image}
                            alt={category.name}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-muted text-[11px]">
                            No image
                          </div>
                        )}
                        {category.sub_title && colors && (
                          <span
                            className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{
                              background: colors.bg,
                              color: colors.color,
                            }}
                          >
                            {category.sub_title}
                          </span>
                        )}
                      </div>

                      <div className="p-2.5 flex flex-col gap-2 flex-1">
                        <p className="text-[13px] font-medium text-primary truncate">
                          {category.name}
                        </p>

                        <button
                          type="button"
                          onClick={() => toggleStatus(category)}
                          className={`self-start px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            category.status === "active"
                              ? "text-success"
                              : "text-danger"
                          }`}
                          style={{
                            borderColor: "var(--border-color)",
                            background:
                              category.status === "active"
                                ? "var(--accent-green-soft)"
                                : "rgba(239,68,68,0.12)",
                          }}
                        >
                          {category.status === "active" ? "Active" : "Inactive"}
                        </button>

                        <div className="flex gap-2 mt-auto">
                          <button
                            type="button"
                            onClick={() => startEdit(category)}
                            className="btn btn-blue flex-1 py-1.5 text-[11px]"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setModalOpen(true);
                              setDeleteId(category._id);
                            }}
                            className="btn btn-danger flex-1 py-1.5 text-[11px]"
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

export default Categories;
