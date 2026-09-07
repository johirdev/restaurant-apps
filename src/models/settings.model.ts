import mongoose, { Schema, Model } from "mongoose";
import {
  DEFAULT_SETTINGS,
  IRestaurantSettingsDocument,
} from "../interfaces/settings.interface";

/* ==========================================================================
   RESTAURANT SETTINGS — একটাই ডকুমেন্ট
   `key` ইউনিক, তাই ভুল করেও দ্বিতীয় সেটিংস রো তৈরি হতে পারে না।
   ========================================================================== */
const settingsSchema = new Schema<IRestaurantSettingsDocument>(
  {
    key: { type: String, required: true, unique: true, default: "restaurant" },

    restaurant_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      default: DEFAULT_SETTINGS.restaurant_name,
    },
    logo: { type: String, default: "" },
    logo_public_id: { type: String, default: "" },
    address: { type: String, trim: true, maxlength: 300, default: "" },
    phone: { type: String, trim: true, maxlength: 40, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    vat_reg_no: { type: String, trim: true, maxlength: 40, default: "" },

    currency: { type: String, trim: true, maxlength: 4, default: DEFAULT_SETTINGS.currency },
    currency_code: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 4,
      default: DEFAULT_SETTINGS.currency_code,
    },

    tax_mode: {
      type: String,
      enum: ["exclusive", "inclusive"],
      default: DEFAULT_SETTINGS.tax_mode,
    },
    vat_percent: { type: Number, min: 0, max: 100, default: DEFAULT_SETTINGS.vat_percent },
    service_charge_percent: {
      type: Number,
      min: 0,
      max: 100,
      default: DEFAULT_SETTINGS.service_charge_percent,
    },
    service_charge_dine_in_only: {
      type: Boolean,
      default: DEFAULT_SETTINGS.service_charge_dine_in_only,
    },

    delivery_fee: { type: Number, min: 0, default: DEFAULT_SETTINGS.delivery_fee },
    free_delivery_above: {
      type: Number,
      min: 0,
      default: DEFAULT_SETTINGS.free_delivery_above,
    },
    min_order_amount: {
      type: Number,
      min: 0,
      default: DEFAULT_SETTINGS.min_order_amount,
    },

    avg_prep_minutes: {
      type: Number,
      min: 1,
      max: 240,
      default: DEFAULT_SETTINGS.avg_prep_minutes,
    },
    order_prefix: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 6,
      default: DEFAULT_SETTINGS.order_prefix,
    },

    invoice_footer: {
      type: String,
      trim: true,
      maxlength: 200,
      default: DEFAULT_SETTINGS.invoice_footer,
    },
    invoice_show_staff: { type: Boolean, default: DEFAULT_SETTINGS.invoice_show_staff },
  },
  { timestamps: true },
);

const SettingsModel: Model<IRestaurantSettingsDocument> =
  (mongoose.models.Settings as Model<IRestaurantSettingsDocument>) ||
  mongoose.model<IRestaurantSettingsDocument>("Settings", settingsSchema);

export default SettingsModel;
