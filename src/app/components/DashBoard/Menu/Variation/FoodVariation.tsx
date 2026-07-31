/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import DeleteModal from "@/src/app/Layout/DeleteModal/DeleteModal";
import { AuthContext } from "@/src/app/dashboard/AuthProvider";

import { toast } from "react-toastify";
import { compressImage } from "@/src/app/Layout/Compressimage/Compressimage";

type DiscountType = "none" | "percentage" | "flat";
type SpiceLevel = "" | "Mild" | "Medium" | "Hot";
type Status = "active" | "inactive";

interface Category {
  _id: string;
  name: string;
  image?: string;
}

interface FoodVariation {
  _id: string;
  foodId?: string;
  category_id?: string;
  category_name?: string;
  name: string;
  sku: string;
  barcode: string;
  preparationTime?: number;
  regularPrice: number;
  discountType?: DiscountType;
  discountValue?: number;
  salePrice: number;
  quantityLabel?: string;
  image?: string;
  image_public_id?: string;
  isOpen?: boolean;
  kitchen_chef?: string;
  spice_level?: SpiceLevel;
  stock_quantity?: number;
  is_default?: boolean;
  sort_order?: number;
  status?: Status;
  createdAt?: string;
  [key: string]: any;
}

interface FormData {
  category_id: string;
  category_name: string;
  name: string;
  sku: string;
  barcode: string;
  preparationTime: string;
  regularPrice: string;
  discountType: DiscountType;
  discountValue: string;
  salePrice: string;
  quantityLabel: string;
  image: string;
  image_public_id: string;
  isOpen: boolean;
  kitchen_chef: string;
  spice_level: SpiceLevel;
  stock_quantity: string;
  is_default: boolean;
  sort_order: string;
  status: Status;
}

interface FormErrors {
  name?: string;
  sku?: string;
  barcode?: string;
  regularPrice?: string;
  salePrice?: string;
}

// ---------- Bangladesh (GS1 prefix 880) EAN-13 barcode generator ----------
function ean13CheckDigit(digits12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(digits12[i], 10);
    sum += i % 2 === 0 ? digit * 1 : digit * 3;
  }
  return (10 - (sum % 10)) % 10;
}

function generateBangladeshBarcode(): string {
  const prefix = "880"; // Bangladesh GS1 country prefix
  let body = prefix;
  for (let i = 0; i < 9; i++) {
    body += Math.floor(Math.random() * 10).toString();
  }
  const check = ean13CheckDigit(body);
  return body + check;
}

function generateSku(name: string): string {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return base ? `${base}-${rand}` : `ITEM-${rand}`;
}

const emptyForm = (): FormData => ({
  category_id: "",
  category_name: "",
  name: "",
  sku: "",
  barcode: generateBangladeshBarcode(),
  preparationTime: "",
  regularPrice: "",
  discountType: "none",
  discountValue: "",
  salePrice: "",
  quantityLabel: "",
  image: "",
  image_public_id: "",
  isOpen: true,
  kitchen_chef: "",
  spice_level: "",
  stock_quantity: "",
  is_default: false,
  sort_order: "0",
  status: "active",
});

const calcSalePrice = (
  regularPrice: string,
  discountType: DiscountType,
  discountValue: string,
) => {
  const rp = Number(regularPrice) || 0;
  const dv = Number(discountValue) || 0;
  if (discountType === "percentage") return Math.max(0, rp - (rp * dv) / 100);
  if (discountType === "flat") return Math.max(0, rp - dv);
  return rp;
};

export const FoodVariation = ({ foodId }: { foodId?: string }) => {
  const { token } = useContext(AuthContext);

  const [variations, setVariations] = useState<FoodVariation[]>([]);
  const [loading, setLoading] = useState(true);

  // categories (for the searchable dropdown)
  const [categories, setCategories] = useState<Category[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryBoxRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [salePriceTouched, setSalePriceTouched] = useState(false);

  const [formOpen, setFormOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchVariations = async () => {
    try {
      const res = await axios.get(`/api/v1/food-variations`, {
        headers: { Authorization: `Bearer ${token}` },
        params: foodId ? { foodId } : undefined,
      });
      setVariations(res.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load variations");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`/api/v1/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories(res.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load categories");
    }
  };

  useEffect(() => {
    fetchVariations();
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foodId]);

  // Close the category dropdown when clicking outside it.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        categoryBoxRef.current &&
        !categoryBoxRef.current.contains(e.target as Node)
      ) {
        setCategoryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-calc sale price whenever regular price / discount changes,
  // unless the user has manually typed a custom sale price this session.
  useEffect(() => {
    if (salePriceTouched) return;
    const computed = calcSalePrice(
      form.regularPrice,
      form.discountType,
      form.discountValue,
    );
    setForm((prev) => ({
      ...prev,
      salePrice: form.regularPrice ? String(computed) : "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.regularPrice, form.discountType, form.discountValue]);

  // ----------------------------------------------------------------
  // CATEGORY DROPDOWN HELPERS
  // ----------------------------------------------------------------
  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase()),
  );

  const selectCategory = (cat: Category) => {
    setForm((prev) => ({
      ...prev,
      category_id: cat._id,
      category_name: cat.name,
    }));
    setCategorySearch(cat.name);
    setCategoryDropdownOpen(false);
  };

  const clearCategory = () => {
    setForm((prev) => ({ ...prev, category_id: "", category_name: "" }));
    setCategorySearch("");
  };

  // ----------------------------------------------------------------
  // FORM HELPERS
  // ----------------------------------------------------------------
  const resetForm = () => {
    setForm(emptyForm());
    setErrors({});
    setMode("create");
    setEditingId(null);
    setSalePriceTouched(false);
    setImageFile(null);
    setImagePreview("");
    setCategorySearch("");
    setCategoryDropdownOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startEdit = (item: FoodVariation) => {
    setForm({
      category_id: item.category_id || "",
      category_name: item.category_name || "",
      name: item.name || "",
      sku: item.sku || "",
      barcode: item.barcode || generateBangladeshBarcode(),
      preparationTime:
        item.preparationTime !== undefined ? String(item.preparationTime) : "",
      regularPrice: String(item.regularPrice ?? ""),
      discountType: item.discountType || "none",
      discountValue:
        item.discountValue !== undefined ? String(item.discountValue) : "",
      salePrice: String(item.salePrice ?? ""),
      quantityLabel: item.quantityLabel || "",
      image: item.image || "",
      image_public_id: item.image_public_id || "",
      isOpen: item.isOpen ?? true,
      kitchen_chef: item.kitchen_chef || "",
      spice_level: item.spice_level || "",
      stock_quantity:
        item.stock_quantity !== undefined ? String(item.stock_quantity) : "",
      is_default: item.is_default ?? false,
      sort_order: String(item.sort_order ?? 0),
      status: item.status || "active",
    });
    setCategorySearch(item.category_name || "");
    setErrors({});
    setSalePriceTouched(true); // keep the saved sale price as-is until user edits pricing again
    setImageFile(null);
    setImagePreview("");
    setMode("edit");
    setEditingId(item._id);
    setFormOpen(true);
  };

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value as any }));
    if (field in errors) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (field === "salePrice") setSalePriceTouched(true);
    if (
      field === "regularPrice" ||
      field === "discountType" ||
      field === "discountValue"
    ) {
      setSalePriceTouched(false); // re-enable auto-calc when pricing inputs change again
    }
  };

  const handleNameChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      name: value,
      sku: prev.sku ? prev.sku : generateSku(value),
    }));
    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
  };

  const regenerateBarcode = () => {
    setForm((prev) => ({ ...prev, barcode: generateBangladeshBarcode() }));
    if (errors.barcode) setErrors((prev) => ({ ...prev, barcode: undefined }));
  };

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }
    setCompressing(true);
    try {
      const compressed = await compressImage(file, {
        maxWidth: 800,
        maxHeight: 800,
        maxSizeKB: 300,
      });
      setImageFile(compressed);
      setImagePreview(URL.createObjectURL(compressed));
    } catch {
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
    if (!file) return { url: existingUrl, public_id: existingPublicId };
    const fd = new FormData();
    fd.append("file", file);
    const res = await axios.post("/api/v1/upload", fd);
    const { url, public_id } = res.data;
    if (mode === "edit" && existingPublicId)
      await deleteOldImage(existingPublicId);
    return { url, public_id };
  };

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.sku.trim()) errs.sku = "SKU is required";
    if (!form.barcode.trim()) errs.barcode = "Barcode is required";
    if (!form.regularPrice || Number(form.regularPrice) <= 0)
      errs.regularPrice = "Regular price is required";
    if (!form.salePrice || Number(form.salePrice) < 0)
      errs.salePrice = "Sale price is required";
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

      const payload: any = {
        ...form,
        foodId,
        image: imgResult.url,
        image_public_id: imgResult.public_id,
        preparationTime: form.preparationTime
          ? Number(form.preparationTime)
          : undefined,
        regularPrice: Number(form.regularPrice),
        discountValue: form.discountValue ? Number(form.discountValue) : 0,
        salePrice: Number(form.salePrice),
        stock_quantity: form.stock_quantity
          ? Number(form.stock_quantity)
          : undefined,
        sort_order: Number(form.sort_order) || 0,
      };

      if (mode === "create") {
        const res = await axios.post(`/api/v1/food-variations`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          toast.success(`Variation "${form.name}" created!`);
          resetForm();
          fetchVariations();
          setFormOpen(false);
        } else {
          toast.error(res.data.message || "Something went wrong.");
        }
      } else {
        const res = await axios.patch(
          `/api/v1/food-variations/${editingId}`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (res.data.success) {
          toast.success("Variation updated!");
          resetForm();
          fetchVariations();
          setFormOpen(false);
        } else {
          toast.error(res.data.message || "Update failed.");
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to save variation.");
    } finally {
      setSubmitting(false);
      setUploadingImage(false);
    }
  };

  const toggleOpen = async (item: FoodVariation) => {
    try {
      const res = await axios.patch(
        `/api/v1/food-variations/${item._id}`,
        { isOpen: !item.isOpen },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data.success) {
        setVariations((prev) =>
          prev.map((v) =>
            v._id === item._id ? { ...v, isOpen: !item.isOpen } : v,
          ),
        );
      }
    } catch {
      toast.error("Failed to update availability.");
    }
  };

  const closeDeleteModal = (): void => {
    setModalOpen(false);
    setDeleteId(null);
  };

  const handleDeleted = (): void => {
    if (!deleteId) return;
    setVariations((prev) => prev.filter((v) => v._id !== deleteId));
    if (editingId === deleteId) resetForm();
    closeDeleteModal();
  };

  const previewImg = imageFile ? imagePreview : form.image;

  return (
    <div className="admin-panel bg-app text-primary min-h-screen p-4 md:p-6">
      {modalOpen && (
        <DeleteModal
          deleteUrl={`/api/v1/food-variations/${deleteId}`}
          title="Variation"
          onDeleted={handleDeleted}
          closeModal={closeDeleteModal}
        />
      )}

      <div className="flex items-center justify-between mb-4 lg:hidden">
        <h1 className="text-lg font-semibold text-primary">Food Variations</h1>
        <button
          type="button"
          onClick={() => {
            if (!formOpen && mode === "edit") resetForm();
            setFormOpen((o) => !o);
          }}
          className="btn btn-primary px-4 py-2 text-sm"
        >
          {formOpen ? "Close" : "+ New Variation"}
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
                <path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24H4a1 1 0 0 0-1 1v5.59a2 2 0 0 0 .59 1.41l9.58 9.58a2 2 0 0 0 2.83 0l4.59-4.59a2 2 0 0 0 0-2.83Z" />
                <circle cx="7.5" cy="7.5" r="1.5" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-[16px] font-medium text-primary">
                {mode === "create" ? "Add Variation" : "Edit Variation"}
              </h2>
              <p className="text-[13px] text-secondary mt-0.5">
                Name, SKU, barcode, regular &amp; sale price are required.
              </p>
            </div>
          </div>

          <div className="px-6 py-6 space-y-5">
            {/* Category — searchable dropdown */}
            <div className="space-y-1.5 relative" ref={categoryBoxRef}>
              <label className="text-[13px] font-medium text-primary">
                Category <span className="text-muted">(optional)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={categorySearch}
                  onChange={(e) => {
                    setCategorySearch(e.target.value);
                    setCategoryDropdownOpen(true);
                    if (form.category_id) {
                      setForm((prev) => ({
                        ...prev,
                        category_id: "",
                        category_name: "",
                      }));
                    }
                  }}
                  onFocus={() => setCategoryDropdownOpen(true)}
                  placeholder="Search category..."
                  className="input-field w-full h-10 px-3 pr-8 text-[14px]"
                />
                {categorySearch && (
                  <button
                    type="button"
                    onClick={clearCategory}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary hover:text-primary text-[13px]"
                    aria-label="Clear category"
                  >
                    ✕
                  </button>
                )}

                {categoryDropdownOpen && (
                  <div
                    className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto rounded-md border-default"
                    style={{ background: "var(--bg-card)" }}
                  >
                    {filteredCategories.length === 0 ? (
                      <p className="px-3 py-2 text-[12px] text-secondary">
                        No category found
                      </p>
                    ) : (
                      filteredCategories.map((cat) => (
                        <button
                          key={cat._id}
                          type="button"
                          onClick={() => selectCategory(cat)}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors ${
                            form.category_id === cat._id
                              ? "text-highlight"
                              : "text-primary"
                          }`}
                          style={{ background: "transparent" }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "var(--bg-hover)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          {cat.image && (
                            <img
                              src={cat.image}
                              alt=""
                              className="w-5 h-5 rounded object-cover"
                            />
                          )}
                          {cat.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {form.category_id && (
                <p className="text-[11px] text-secondary">
                  Selected:{" "}
                  <span className="text-highlight">{form.category_name}</span>
                </p>
              )}
            </div>

            {/* Image */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-primary">
                Image <span className="text-muted">(optional)</span>
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
                placeholder="Half / Full / Regular"
                className={`input-field w-full h-10 px-3 text-[14px] ${errors.name ? "input-error" : ""}`}
              />
              {errors.name && (
                <p className="text-[12px] text-danger">{errors.name}</p>
              )}
            </div>

            {/* SKU + Prep time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">
                  SKU <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={form.sku}
                  onChange={(e) =>
                    handleChange("sku", e.target.value.toUpperCase())
                  }
                  placeholder="KACCHI-H"
                  className={`input-field w-full h-10 px-3 text-[13px] ${errors.sku ? "input-error" : ""}`}
                />
                {errors.sku && (
                  <p className="text-[12px] text-danger">{errors.sku}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">
                  Prep Time (min) <span className="text-muted">(optional)</span>
                </label>
                <input
                  type="number"
                  value={form.preparationTime}
                  onChange={(e) =>
                    handleChange("preparationTime", e.target.value)
                  }
                  placeholder="20"
                  className="input-field w-full h-10 px-3 text-[13px]"
                />
              </div>
            </div>

            {/* Barcode */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-primary">
                Barcode <span className="text-danger">*</span>{" "}
                <span className="text-muted">
                  (BD 880 prefix, auto-generated)
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.barcode}
                  onChange={(e) => handleChange("barcode", e.target.value)}
                  className={`input-field flex-1 h-10 px-3 text-[13px] font-mono ${errors.barcode ? "input-error" : ""}`}
                />
                <button
                  type="button"
                  onClick={regenerateBarcode}
                  className="btn btn-outline px-3 text-[12px]"
                >
                  Regenerate
                </button>
              </div>
              {errors.barcode && (
                <p className="text-[12px] text-danger">{errors.barcode}</p>
              )}
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">
                  Regular Price (৳) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  value={form.regularPrice}
                  onChange={(e) => handleChange("regularPrice", e.target.value)}
                  placeholder="160"
                  className={`input-field w-full h-10 px-3 text-[13px] ${errors.regularPrice ? "input-error" : ""}`}
                />
                {errors.regularPrice && (
                  <p className="text-[12px] text-danger">
                    {errors.regularPrice}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">
                  Sale Price (৳) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  value={form.salePrice}
                  onChange={(e) => handleChange("salePrice", e.target.value)}
                  placeholder="Auto-calculated"
                  className={`input-field w-full h-10 px-3 text-[13px] ${errors.salePrice ? "input-error" : ""}`}
                />
                {errors.salePrice && (
                  <p className="text-[12px] text-danger">{errors.salePrice}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">
                  Discount Type
                </label>
                <select
                  value={form.discountType}
                  onChange={(e) => handleChange("discountType", e.target.value)}
                  className="input-field w-full h-10 px-3 text-[13px]"
                >
                  <option value="none" className="bg-elevated text-primary">
                    None
                  </option>
                  <option
                    value="percentage"
                    className="bg-elevated text-primary"
                  >
                    Percentage (%)
                  </option>
                  <option value="flat" className="bg-elevated text-primary">
                    Flat (৳)
                  </option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">
                  Discount Value <span className="text-muted">(optional)</span>
                </label>
                <input
                  type="number"
                  value={form.discountValue}
                  onChange={(e) =>
                    handleChange("discountValue", e.target.value)
                  }
                  disabled={form.discountType === "none"}
                  placeholder="0"
                  className="input-field w-full h-10 px-3 text-[13px] disabled:opacity-50"
                />
              </div>
            </div>

            {/* Quantity label + Stock */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">
                  Quantity Label <span className="text-muted">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.quantityLabel}
                  onChange={(e) =>
                    handleChange("quantityLabel", e.target.value)
                  }
                  placeholder="1 Person"
                  className="input-field w-full h-10 px-3 text-[13px]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">
                  Stock Qty <span className="text-muted">(optional)</span>
                </label>
                <input
                  type="number"
                  value={form.stock_quantity}
                  onChange={(e) =>
                    handleChange("stock_quantity", e.target.value)
                  }
                  placeholder="Unlimited if empty"
                  className="input-field w-full h-10 px-3 text-[13px]"
                />
              </div>
            </div>

            {/* Kitchen/Chef + Spice level */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">
                  Kitchen / Chef <span className="text-muted">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.kitchen_chef}
                  onChange={(e) => handleChange("kitchen_chef", e.target.value)}
                  placeholder="Chef Karim"
                  className="input-field w-full h-10 px-3 text-[13px]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-primary">
                  Spice Level
                </label>
                <select
                  value={form.spice_level}
                  onChange={(e) => handleChange("spice_level", e.target.value)}
                  className="input-field w-full h-10 px-3 text-[13px]"
                >
                  <option value="" className="bg-elevated text-primary">
                    None
                  </option>
                  <option value="Mild" className="bg-elevated text-primary">
                    Mild
                  </option>
                  <option value="Medium" className="bg-elevated text-primary">
                    Medium
                  </option>
                  <option value="Hot" className="bg-elevated text-primary">
                    Hot
                  </option>
                </select>
              </div>
            </div>

            {/* Order + Status */}
            <div className="grid grid-cols-2 gap-4">
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

            {/* Toggles */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-[13px] text-primary cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isOpen}
                  onChange={(e) => handleChange("isOpen", e.target.checked)}
                  className="w-4 h-4"
                />
                Available for order (isOpen)
              </label>
              <label className="flex items-center gap-2 text-[13px] text-primary cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(e) => handleChange("is_default", e.target.checked)}
                  className="w-4 h-4"
                />
                Default variation
              </label>
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
              {submitting
                ? uploadingImage
                  ? "Uploading..."
                  : mode === "create"
                    ? "Creating..."
                    : "Updating..."
                : mode === "create"
                  ? "Create Variation"
                  : "Update Variation"}
            </button>
          </div>
        </div>

        {/* ============== RIGHT: VARIATION LIST ============== */}
        <div className="bg-card border-default rounded-xl overflow-hidden">
          {loading ? (
            <p className="p-6 text-secondary text-sm">Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-default-b">
                  <tr>
                    <th className="px-4 py-3 text-secondary font-semibold">
                      Name
                    </th>
                    <th className="px-4 py-3 text-secondary font-semibold">
                      Category
                    </th>
                    <th className="px-4 py-3 text-secondary font-semibold">
                      SKU
                    </th>
                    <th className="px-4 py-3 text-secondary font-semibold">
                      Barcode
                    </th>
                    <th className="px-4 py-3 text-secondary font-semibold">
                      Regular
                    </th>
                    <th className="px-4 py-3 text-secondary font-semibold">
                      Sale
                    </th>
                    <th className="px-4 py-3 text-secondary font-semibold">
                      Qty Label
                    </th>
                    <th className="px-4 py-3 text-secondary font-semibold">
                      Available
                    </th>
                    <th className="px-4 py-3 text-secondary font-semibold text-center">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {variations.map((item, index) => (
                    <tr
                      key={item._id}
                      className={`table-row-hover ${index % 2 === 0 ? "table-row-alt" : ""} ${
                        editingId === item._id ? "outline outline-1" : ""
                      }`}
                      style={
                        editingId === item._id
                          ? { outlineColor: "var(--accent-blue)" }
                          : undefined
                      }
                    >
                      <td className="px-4 py-3 text-primary">
                        <div className="flex items-center gap-2">
                          {item.image && (
                            <img
                              src={item.image}
                              alt=""
                              className="w-7 h-7 rounded object-cover"
                            />
                          )}
                          {item.name}
                          {item.is_default && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{
                                background: "var(--accent-purple-soft)",
                                color: "#a78bfa",
                              }}
                            >
                              default
                            </span>
                          )}
                        </div>
                      </td>
                  
                      <td className="px-4 py-3 text-secondary">
                        {item.category_name || "-"}
                      </td>
                      <td className="px-4 py-3 text-secondary font-mono text-[12px]">
                        {item.sku}
                      </td>
                      <td className="px-4 py-3 text-secondary font-mono text-[12px]">
                        {item.barcode}
                      </td>
                      <td className="px-4 py-3 text-secondary">
                        ৳{item.regularPrice}
                      </td>
                      <td className="px-4 py-3 text-primary font-medium">
                        ৳{item.salePrice}
                      </td>
                      <td className="px-4 py-3 text-secondary">
                        {item.quantityLabel || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleOpen(item)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                            item.isOpen ? "text-success" : "text-danger"
                          }`}
                          style={{
                            borderColor: "var(--border-color)",
                            background: item.isOpen
                              ? "var(--accent-green-soft)"
                              : "rgba(239,68,68,0.12)",
                          }}
                        >
                          {item.isOpen ? "Open" : "Closed"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 items-center justify-center">
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            className="btn btn-blue px-3 py-1.5 text-[12px]"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setModalOpen(true);
                              setDeleteId(item._id);
                            }}
                            className="btn btn-danger px-3 py-1.5 text-[12px]"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {variations.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-8 text-center text-secondary"
                      >
                        No variations yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FoodVariation;
