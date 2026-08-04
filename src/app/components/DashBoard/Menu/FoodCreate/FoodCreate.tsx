// src/app/dashboard/food/FoodManager.tsx
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import DeleteModal from "@/src/app/Layout/DeleteModal/DeleteModal";
import { AuthContext } from "@/src/app/dashboard/AuthProvider";
import { VariationFields } from "./VariationFields";
import {
  VariationValue,
  emptyVariation,
  variationFromApi,
} from "./foodVariationUtils";

interface Category {
  _id: string;
  name: string;
  image?: string;
}

interface FoodItem {
  _id: string;
  name: string;
  category_id?: string;
  category_name?: string;
  image?: string;
  status?: "active" | "inactive";
  variations: any[];
  createdAt?: string;
}

export const FoodCreate = () => {
  const { token } = useContext(AuthContext);
  const headers = { Authorization: `Bearer ${token}` };

  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryBoxRef = useRef<HTMLDivElement>(null);

  // ---- right panel product search ----
  const [productSearch, setProductSearch] = useState("");

  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null);
  const [removedVariationIds, setRemovedVariationIds] = useState<string[]>([]);

  const [foodName, setFoodName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [variations, setVariations] = useState<VariationValue[]>([
    emptyVariation(true),
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ---------------- fetch ----------------
  const fetchFoods = async () => {
    try {
      const res = await axios.get(`/api/v1/foods`, { headers });
      setFoods(res.data.data || []);
    } catch {
      toast.error("Failed to load food items");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`/api/v1/categories`, { headers });
      setCategories(res.data.data || []);
    } catch {
      toast.error("Failed to load categories");
    }
  };

  useEffect(() => {
    fetchFoods();
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (
        categoryBoxRef.current &&
        !categoryBoxRef.current.contains(e.target as Node)
      ) {
        setCategoryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // ---------------- category helpers (left form) ----------------
  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase()),
  );
  const selectCategory = (cat: Category) => {
    setCategoryId(cat._id);
    setCategoryName(cat.name);
    setCategorySearch(cat.name);
    setCategoryDropdownOpen(false);
  };
  const clearCategory = () => {
    setCategoryId("");
    setCategoryName("");
    setCategorySearch("");
  };

  // ---------------- right panel product search ----------------
  const filteredFoods = foods.filter((food) => {
    const term = productSearch.trim().toLowerCase();
    if (!term) return true;
    return (
      food.name.toLowerCase().includes(term) ||
      (food.category_name || "").toLowerCase().includes(term) ||
      food.variations.some(
        (v: any) =>
          v.name?.toLowerCase().includes(term) ||
          v.sku?.toLowerCase().includes(term) ||
          v.barcode?.toLowerCase().includes(term),
      )
    );
  });

  // ---------------- form helpers ----------------
  const resetForm = () => {
    setFoodName("");
    clearCategory();
    setVariations([emptyVariation(true)]);
    setErrors({});
    setMode("create");
    setEditingFoodId(null);
    setRemovedVariationIds([]);
  };

  const startEdit = (food: FoodItem) => {
    setFoodName(food.name);
    setCategoryId(food.category_id || "");
    setCategoryName(food.category_name || "");
    setCategorySearch(food.category_name || "");
    setVariations(food.variations.map(variationFromApi));
    setErrors({});
    setMode("edit");
    setEditingFoodId(food._id);
    setRemovedVariationIds([]);
    setFormOpen(true);
  };

  const patchVariation = (uid: string, patch: Partial<VariationValue>) => {
    setVariations((prev) =>
      prev.map((v) => (v.uid === uid ? { ...v, ...patch } : v)),
    );
  };

  const addVariation = () =>
    setVariations((prev) => [...prev, emptyVariation(prev.length === 0)]);

  const removeVariation = (v: VariationValue) => {
    if (v._id) setRemovedVariationIds((prev) => [...prev, v._id!]);
    setVariations((prev) => {
      const next = prev.filter((x) => x.uid !== v.uid);
      if (next.length && !next.some((x) => x.is_default))
        next[0].is_default = true;
      return next.length ? next : [emptyVariation(true)];
    });
  };

  const setDefaultVariation = (uid: string) => {
    setVariations((prev) =>
      prev.map((v) => ({ ...v, is_default: v.uid === uid })),
    );
  };

  // ---------------- validation ----------------
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!foodName.trim()) errs.foodName = "Food name is required";
    variations.forEach((v, idx) => {
      if (!v.name.trim()) errs[`v-${idx}-name`] = "Variation name is required";
      if (!v.regularPrice || Number(v.regularPrice) <= 0)
        errs[`v-${idx}-price`] = "Regular price is required";
      const hasImage = v.images.some((s) => s.file || s.existingUrl);
      if (!hasImage) errs[`v-${idx}-image`] = "At least 1 image is required";
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const errorsFor = (idx: number) => ({
    name: errors[`v-${idx}-name`],
    regularPrice: errors[`v-${idx}-price`],
    image: errors[`v-${idx}-image`],
  });

  // ---------------- image upload ----------------
  const uploadOne = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await axios.post("/api/v1/upload", fd);
    return {
      url: res.data.url as string,
      public_id: res.data.public_id as string,
    };
  };

  const resolveImages = async (v: VariationValue) => {
    const uploaded = [];
    for (const slot of v.images) {
      if (slot.file) uploaded.push(await uploadOne(slot.file));
      else if (slot.existingUrl)
        uploaded.push({
          url: slot.existingUrl,
          public_id: slot.existingPublicId,
        });
    }
    return uploaded;
  };

  const buildVariationPayload = async (v: VariationValue) => ({
    name: v.name,
    sku: v.sku,
    barcode: v.barcode,
    regularPrice: Number(v.regularPrice),
    discountType: v.discountType,
    discountValue: v.discountValue ? Number(v.discountValue) : 0,
    salePrice: v.salePrice ? Number(v.salePrice) : undefined,
    preparationTime: v.preparationTime ? Number(v.preparationTime) : undefined,
    quantityLabel: v.quantityLabel || undefined,
    kitchen_chef: v.kitchen_chef || undefined,
    spice_level: v.spice_level || undefined,
    stock_quantity: v.stock_quantity ? Number(v.stock_quantity) : undefined,
    isOpen: v.isOpen,
    is_default: v.is_default,
    sort_order: Number(v.sort_order) || 0,
    status: v.status,
    images: await resolveImages(v),
  });

  // ---------------- submit ----------------
  const handleSubmit = async () => {
    if (!validate()) {
      toast.error("Please fill in the required fields");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "create") {
        const preparedVariations = await Promise.all(
          variations.map(buildVariationPayload),
        );
        const res = await axios.post(
          `/api/v1/foods`,
          {
            name: foodName,
            category_id: categoryId || undefined,
            category_name: categoryName || undefined,
            variations: preparedVariations,
          },
          { headers },
        );
        if (res.data.success) {
          toast.success(`"${foodName}" created!`);
          resetForm();
          setFormOpen(false);
          fetchFoods();
        } else {
          toast.error(res.data.message || "Something went wrong");
        }
      } else if (editingFoodId) {
        await axios.patch(
          `/api/v1/foods/${editingFoodId}`,
          {
            name: foodName,
            category_id: categoryId || undefined,
            category_name: categoryName || undefined,
          },
          { headers },
        );

        for (const vid of removedVariationIds) {
          await axios.delete(
            `/api/v1/foods/${editingFoodId}/variations/${vid}`,
            { headers },
          );
        }

        for (const v of variations) {
          const payload = await buildVariationPayload(v);
          if (v._id) {
            await axios.patch(
              `/api/v1/foods/${editingFoodId}/variations/${v._id}`,
              payload,
              { headers },
            );
          } else {
            await axios.post(
              `/api/v1/foods/${editingFoodId}/variations`,
              payload,
              { headers },
            );
          }
        }

        toast.success("Food item updated!");
        resetForm();
        setFormOpen(false);
        fetchFoods();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save food item");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------- delete food ----------------
  const closeDeleteModal = () => {
    setModalOpen(false);
    setDeleteId(null);
  };
  const handleDeleted = () => {
    if (!deleteId) return;
    setFoods((prev) => prev.filter((f) => f._id !== deleteId));
    if (editingFoodId === deleteId) resetForm();
    closeDeleteModal();
  };

  return (
    <div className="admin-panel bg-app text-primary min-h-screen p-4 md:p-6">
      {modalOpen && (
        <DeleteModal
          deleteUrl={`/api/v1/foods/${deleteId}`}
          title="Food Item"
          onDeleted={handleDeleted}
          closeModal={closeDeleteModal}
        />
      )}

      <div className="flex items-center justify-between mb-4 lg:hidden">
        <h1 className="text-lg font-semibold text-primary">Food Items</h1>
        <button
          type="button"
          onClick={() => {
            if (!formOpen && mode === "edit") resetForm();
            setFormOpen((o) => !o);
          }}
          className="btn btn-primary px-4 py-2 text-sm"
        >
          {formOpen ? "Close" : "+ New Food Item"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[660px_1fr] gap-6 items-start">
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
                viewBox="0 0 24 24"
              >
                <path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24H4a1 1 0 0 0-1 1v5.59a2 2 0 0 0 .59 1.41l9.58 9.58a2 2 0 0 0 2.83 0l4.59-4.59a2 2 0 0 0 0-2.83Z" />
                <circle cx="7.5" cy="7.5" r="1.5" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-[16px] font-medium text-primary">
                {mode === "create" ? "Add Food Item" : "Edit Food Item"}
              </h2>
              <p className="text-[13px] text-secondary mt-0.5">
                Food name, প্রতি variation-এ নাম, দাম ও ১টি ছবি লাগবে।
              </p>
            </div>
          </div>

          <div className="px-6 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Food Name */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-primary">
                Food Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                placeholder="Kacchi Biryani"
                className={`input-field w-full h-10 px-3 text-[14px] ${errors.foodName ? "input-error" : ""}`}
              />
              {errors.foodName && (
                <p className="text-[12px] text-danger">{errors.foodName}</p>
              )}
            </div>

            {/* Category */}
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
                    if (categoryId) {
                      setCategoryId("");
                      setCategoryName("");
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
                          className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] ${
                            categoryId === cat._id
                              ? "text-highlight"
                              : "text-primary"
                          }`}
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
            </div>

            {/* Variations */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-medium text-primary">
                  Variations
                </h3>
                <button
                  type="button"
                  onClick={addVariation}
                  className="btn btn-outline px-3 py-1.5 text-[12px]"
                >
                  + Add Variation
                </button>
              </div>
              {variations.map((v, idx) => (
                <VariationFields
                  key={v.uid}
                  value={v}
                  onChange={(patch) => patchVariation(v.uid, patch)}
                  errors={errorsFor(idx)}
                  label={`Variation ${idx + 1}`}
                  onRemove={
                    variations.length > 1 ? () => removeVariation(v) : undefined
                  }
                  onSetDefault={() => setDefaultVariation(v.uid)}
                />
              ))}
            </div>
          </div>

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
              disabled={submitting}
              className="btn btn-primary px-6 py-2 text-[13px]"
            >
              {submitting
                ? mode === "create"
                  ? "Creating..."
                  : "Updating..."
                : mode === "create"
                  ? "Create Food Item"
                  : "Update Food Item"}
            </button>
          </div>
        </div>

        {/* ============== RIGHT: FOOD GRID ============== */}
        <div className="bg-card border-default rounded-xl overflow-hidden">
          {/* Search bar */}
          <div className="p-4 border-default-b">
            <div className="relative">
              <svg
                className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search by name, category, SKU or barcode..."
                className="input-field w-full h-10 pl-10 pr-9 text-[14px]"
              />
              {productSearch && (
                <button
                  type="button"
                  onClick={() => setProductSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary text-[13px]"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            {productSearch && (
              <p className="text-[11px] text-secondary mt-2">
                {filteredFoods.length} of {foods.length} item
                {foods.length === 1 ? "" : "s"}
              </p>
            )}
          </div>

          {loading ? (
            <p className="p-6 text-secondary text-sm">Loading...</p>
          ) : foods.length === 0 ? (
            <p className="px-4 py-8 text-center text-secondary text-sm">
              No food items yet.
            </p>
          ) : filteredFoods.length === 0 ? (
            <p className="px-4 py-8 text-center text-secondary text-sm">
              No items match your search.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
              {filteredFoods.map((food) => (
                <div
                  key={food._id}
                  className={`bg-elevated border-default rounded-lg p-4 flex flex-col gap-3 ${
                    editingFoodId === food._id ? "outline outline-1" : ""
                  }`}
                  style={
                    editingFoodId === food._id
                      ? { outlineColor: "var(--accent-blue)" }
                      : undefined
                  }
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-default flex items-center justify-center"
                      style={{ background: "var(--bg-input)" }}
                    >
                      {food.image ? (
                        <img
                          src={food.image}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg
                          className="w-5 h-5 text-muted"
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
                      <h3 className="text-[14px] font-medium text-primary truncate">
                        {food.name}
                      </h3>
                      <p className="text-[12px] text-secondary truncate">
                        {food.category_name || "No category"}
                      </p>
                      <p className="text-[11px] text-muted mt-0.5">
                        {food.variations.length} variation(s)
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {food.variations.slice(0, 3).map((v: any) => (
                      <span
                        key={v._id}
                        className="text-[11px] px-2 py-0.5 rounded-full border-default text-secondary"
                      >
                        {v.name} — ৳{v.salePrice}
                      </span>
                    ))}
                    {food.variations.length > 3 && (
                      <span className="text-[11px] text-muted">
                        +{food.variations.length - 3} more
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2 border-default-t">
                    <button
                      type="button"
                      onClick={() => startEdit(food)}
                      className="btn btn-blue flex-1 py-1.5 text-[12px]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalOpen(true);
                        setDeleteId(food._id);
                      }}
                      className="btn btn-danger flex-1 py-1.5 text-[12px]"
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
  );
};

export default FoodCreate;
