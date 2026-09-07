import mongoose, { Schema, Model } from "mongoose";
import { ITableDocument, TABLE_STATUSES } from "../interfaces/table.interface";

const tableSchema = new Schema<ITableDocument>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 40,
    },
    sort_order: { type: Number, default: 0 },

    image: { type: String, default: "" },
    image_public_id: { type: String, default: "" },

    capacity: { type: Number, required: true, min: 1, max: 50, default: 4 },
    zone: { type: String, trim: true, maxlength: 60, default: "" },

    status: { type: String, enum: TABLE_STATUSES, default: "free" },

    waiter_id: { type: String, default: "" },
    waiter_name: { type: String, trim: true, default: "" },

    current_order_id: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    current_order_number: { type: String, trim: true, default: "" },
    occupied_since: { type: Date, default: null },

    is_active: { type: Boolean, default: true },
    notes: { type: String, trim: true, maxlength: 300, default: "" },
  },
  { timestamps: true },
);

// ফ্লোর ম্যাপ সবসময় একই ক্রমে সাজানো থাকে
tableSchema.index({ sort_order: 1, name: 1 });
tableSchema.index({ status: 1 });
tableSchema.index({ waiter_id: 1 });

const TableModel: Model<ITableDocument> =
  (mongoose.models.Table as Model<ITableDocument>) ||
  mongoose.model<ITableDocument>("Table", tableSchema);

export default TableModel;
