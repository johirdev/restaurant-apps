/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/Layout/foodVariationUtils.ts

export type DiscountType = "none" | "percentage" | "flat";
export type SpiceLevel = "" | "Mild" | "Medium" | "Hot";
export type Status = "active" | "inactive";

const ean13CheckDigit = (d: string) => {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += i % 2 === 0 ? +d[i] : +d[i] * 3;
  return (10 - (sum % 10)) % 10;
};

export const generateBarcode = () => {
  let body = "880";
  for (let i = 0; i < 9; i++) body += Math.floor(Math.random() * 10);
  return body + ean13CheckDigit(body);
};

export const generateSku = (name: string) => {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return base ? `${base}-${rand}` : `ITEM-${rand}`;
};

export const calcSalePrice = (
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

export const uid = () => Math.random().toString(36).slice(2, 10);

// One image slot — during "create" existingUrl is empty, during "edit" it's prefilled.
export interface ImageSlot {
  existingUrl: string;
  existingPublicId: string;
  file: File | null;
  preview: string | null; // local preview (new file) OR existingUrl
}

export const emptySlots = (): ImageSlot[] =>
  [0, 1, 2].map(() => ({
    existingUrl: "",
    existingPublicId: "",
    file: null,
    preview: null,
  }));

export interface VariationValue {
  uid: string;
  _id?: string; // present only when editing an existing variation
  name: string;
  regularPrice: string;
  discountType: DiscountType;
  discountValue: string;
  salePrice: string;
  salePriceTouched: boolean;
  sku: string;
  barcode: string;
  preparationTime: string;
  quantityLabel: string;
  kitchen_chef: string;
  spice_level: SpiceLevel;
  stock_quantity: string;
  isOpen: boolean;
  is_default: boolean;
  sort_order: string;
  status: Status;
  advancedOpen: boolean;
  images: ImageSlot[];
}

export const emptyVariation = (isFirst = false): VariationValue => ({
  uid: uid(),
  name: "",
  regularPrice: "",
  discountType: "none",
  discountValue: "",
  salePrice: "",
  salePriceTouched: false,
  sku: "",
  barcode: generateBarcode(),
  preparationTime: "",
  quantityLabel: "",
  kitchen_chef: "",
  spice_level: "",
  stock_quantity: "",
  isOpen: true,
  is_default: isFirst,
  sort_order: "0",
  status: "active",
  advancedOpen: false,
  images: emptySlots(),
});

export const variationFromApi = (v: any): VariationValue => ({
  uid: uid(),
  _id: v._id,
  name: v.name || "",
  regularPrice: String(v.regularPrice ?? ""),
  discountType: v.discountType || "none",
  discountValue: v.discountValue !== undefined ? String(v.discountValue) : "",
  salePrice: String(v.salePrice ?? ""),
  salePriceTouched: true,
  sku: v.sku || "",
  barcode: v.barcode || generateBarcode(),
  preparationTime:
    v.preparationTime !== undefined ? String(v.preparationTime) : "",
  quantityLabel: v.quantityLabel || "",
  kitchen_chef: v.kitchen_chef || "",
  spice_level: v.spice_level || "",
  stock_quantity:
    v.stock_quantity !== undefined ? String(v.stock_quantity) : "",
  isOpen: v.isOpen ?? true,
  is_default: v.is_default ?? false,
  sort_order: String(v.sort_order ?? 0),
  status: v.status || "active",
  advancedOpen: false,
  images: [0, 1, 2].map((i) => {
    const img = v.images?.[i];
    return {
      existingUrl: img?.url || "",
      existingPublicId: img?.public_id || "",
      file: null,
      preview: img?.url || null,
    };
  }),
});
