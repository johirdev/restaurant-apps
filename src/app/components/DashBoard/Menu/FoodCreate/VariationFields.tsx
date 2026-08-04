// src/app/dashboard/food/VariationFields.tsx
"use client";

import { compressImage } from "@/src/app/Layout/Compressimage/Compressimage";
import { toast } from "react-toastify";
import {
  VariationValue,
  DiscountType,
  SpiceLevel,
  calcSalePrice,
  generateBarcode,
  generateSku,
} from "./foodVariationUtils";

interface Props {
  value: VariationValue;
  onChange: (patch: Partial<VariationValue>) => void;
  errors?: Record<string, string>;
  label?: string;
  onRemove?: () => void;
  onSetDefault?: () => void;
}

export const VariationFields = ({
  value: v,
  onChange,
  errors = {},
  label,
  onRemove,
  onSetDefault,
}: Props) => {
  const handlePricingChange = (patch: Partial<VariationValue>) => {
    const merged = { ...v, ...patch };
    if (
      "regularPrice" in patch ||
      "discountType" in patch ||
      "discountValue" in patch
    ) {
      merged.salePriceTouched = false;
    }
    if (!merged.salePriceTouched) {
      merged.salePrice = merged.regularPrice
        ? String(
            calcSalePrice(
              merged.regularPrice,
              merged.discountType,
              merged.discountValue,
            ),
          )
        : "";
    }
    onChange(merged);
  };

  const handleNameChange = (name: string) => {
    onChange({ name, sku: v.sku || generateSku(name) });
  };

  const pickImage = async (slot: number, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }
    try {
      const compressed = await compressImage(file, {
        maxWidth: 800,
        maxHeight: 800,
        maxSizeKB: 300,
      });
      const images = [...v.images];
      images[slot] = {
        ...images[slot],
        file: compressed,
        preview: URL.createObjectURL(compressed),
      };
      onChange({ images });
    } catch {
      const images = [...v.images];
      images[slot] = {
        ...images[slot],
        file,
        preview: URL.createObjectURL(file),
      };
      onChange({ images });
    }
  };

  const removeImage = (slot: number) => {
    const images = [...v.images];
    images[slot] = {
      existingUrl: "",
      existingPublicId: "",
      file: null,
      preview: null,
    };
    onChange({ images });
  };

  return (
    <div className="bg-elevated border-default rounded-lg p-4 space-y-4">
      {(label || onRemove) && (
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-secondary">
            {label}{" "}
            {v.is_default && <span className="text-highlight">(default)</span>}
          </span>
          <div className="flex items-center gap-3">
            {onSetDefault && !v.is_default && (
              <button
                type="button"
                onClick={onSetDefault}
                className="text-[12px] text-highlight hover:underline"
              >
                Set as default
              </button>
            )}
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="text-[12px] text-danger hover:underline"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      )}

      {/* Name + Regular Price */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-primary">
            Name <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={v.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Half / Full / Regular"
            className={`input-field w-full h-10 px-3 text-[14px] ${errors.name ? "input-error" : ""}`}
          />
          {errors.name && (
            <p className="text-[12px] text-danger">{errors.name}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-primary">
            Regular Price (৳) <span className="text-danger">*</span>
          </label>
          <input
            type="number"
            value={v.regularPrice}
            onChange={(e) =>
              handlePricingChange({ regularPrice: e.target.value })
            }
            placeholder="160"
            className={`input-field w-full h-10 px-3 text-[14px] ${errors.regularPrice ? "input-error" : ""}`}
          />
          {errors.regularPrice && (
            <p className="text-[12px] text-danger">{errors.regularPrice}</p>
          )}
        </div>
      </div>

      {/* Images */}
      <div className="space-y-1.5">
        <label className="text-[13px] font-medium text-primary">
          Images <span className="text-danger">*</span>{" "}
          <span className="text-muted">(up to 3, at least 1 required)</span>
        </label>
        <div className="flex gap-3">
          {v.images.map((slot, idx) => (
            <div key={idx} className="relative">
              <label
                className="w-16 h-16 rounded-lg border-default flex items-center justify-center overflow-hidden cursor-pointer"
                style={{ background: "var(--bg-input)" }}
              >
                {slot.preview ? (
                  <img
                    src={slot.preview}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[10px] text-muted">
                    {idx === 0 ? "Required" : "Optional"}
                  </span>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => pickImage(idx, e.target.files?.[0] || null)}
                />
              </label>
              {slot.preview && (
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-danger text-white text-[10px] flex items-center justify-center"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        {errors.image && (
          <p className="text-[12px] text-danger">{errors.image}</p>
        )}
      </div>

      {/* Sale price + Discount */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-primary">
            Sale Price (৳) <span className="text-muted">(auto-calculated)</span>
          </label>
          <input
            type="number"
            value={v.salePrice}
            onChange={(e) =>
              onChange({ salePrice: e.target.value, salePriceTouched: true })
            }
            className="input-field w-full h-10 px-3 text-[13px]"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-primary">
            Discount Type <span className="text-muted">(optional)</span>
          </label>
          <select
            value={v.discountType}
            onChange={(e) =>
              handlePricingChange({
                discountType: e.target.value as DiscountType,
              })
            }
            className="input-field w-full h-10 px-3 text-[13px]"
          >
            <option value="none">None</option>
            <option value="percentage">Percentage (%)</option>
            <option value="flat">Flat (৳)</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-primary">
            Discount Value <span className="text-muted">(optional)</span>
          </label>
          <input
            type="number"
            value={v.discountValue}
            disabled={v.discountType === "none"}
            onChange={(e) =>
              handlePricingChange({ discountValue: e.target.value })
            }
            className="input-field w-full h-10 px-3 text-[13px] disabled:opacity-50"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-primary">
            Prep Time (min) <span className="text-muted">(optional)</span>
          </label>
          <input
            type="number"
            value={v.preparationTime}
            onChange={(e) => onChange({ preparationTime: e.target.value })}
            placeholder="20"
            className="input-field w-full h-10 px-3 text-[13px]"
          />
        </div>
      </div>

      {/* SKU + Barcode */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-primary">
            SKU <span className="text-muted">(auto-generated)</span>
          </label>
          <input
            type="text"
            value={v.sku}
            onChange={(e) => onChange({ sku: e.target.value.toUpperCase() })}
            placeholder="KACCHI-H"
            className="input-field w-full h-10 px-3 text-[13px] font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-primary">
            Barcode <span className="text-muted">(auto-generated)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={v.barcode}
              onChange={(e) => onChange({ barcode: e.target.value })}
              className="input-field flex-1 h-10 px-3 text-[13px] font-mono"
            />
            <button
              type="button"
              onClick={() => onChange({ barcode: generateBarcode() })}
              className="btn btn-outline px-3 text-[12px]"
            >
              ↻
            </button>
          </div>
        </div>
      </div>

      {/* Quantity label + Stock */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-primary">
            Quantity Label <span className="text-muted">(optional)</span>
          </label>
          <input
            type="text"
            value={v.quantityLabel}
            onChange={(e) => onChange({ quantityLabel: e.target.value })}
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
            value={v.stock_quantity}
            onChange={(e) => onChange({ stock_quantity: e.target.value })}
            placeholder="Unlimited if empty"
            className="input-field w-full h-10 px-3 text-[13px]"
          />
        </div>
      </div>

      {/* Kitchen/Chef + Spice level */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-primary">
            Kitchen / Chef <span className="text-muted">(optional)</span>
          </label>
          <input
            type="text"
            value={v.kitchen_chef}
            onChange={(e) => onChange({ kitchen_chef: e.target.value })}
            placeholder="Chef Karim"
            className="input-field w-full h-10 px-3 text-[13px]"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-primary">
            Spice Level
          </label>
          <select
            value={v.spice_level}
            onChange={(e) =>
              onChange({ spice_level: e.target.value as SpiceLevel })
            }
            className="input-field w-full h-10 px-3 text-[13px]"
          >
            <option value="">None</option>
            <option value="Mild">Mild</option>
            <option value="Medium">Medium</option>
            <option value="Hot">Hot</option>
          </select>
        </div>
      </div>

      {/* Sort order + Status */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-primary">
            Order <span className="text-muted">(optional)</span>
          </label>
          <input
            type="number"
            value={v.sort_order}
            onChange={(e) => onChange({ sort_order: e.target.value })}
            className="input-field w-full h-10 px-3 text-[13px]"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-primary">Status</label>
          <select
            value={v.status}
            onChange={(e) =>
              onChange({ status: e.target.value as "active" | "inactive" })
            }
            className="input-field w-full h-10 px-3 text-[13px]"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Toggles */}
      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 text-[13px] text-primary cursor-pointer">
          <input
            type="checkbox"
            checked={v.isOpen}
            onChange={(e) => onChange({ isOpen: e.target.checked })}
            className="w-4 h-4"
          />
          Available for order
        </label>
        <label className="flex items-center gap-2 text-[13px] text-primary cursor-pointer">
          <input
            type="checkbox"
            checked={v.is_default}
            onChange={(e) => (e.target.checked ? onSetDefault?.() : undefined)}
            disabled={v.is_default}
            className="w-4 h-4"
          />
          Default variation
        </label>
      </div>
    </div>
  );
};

export default VariationFields;
