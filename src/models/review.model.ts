import mongoose, { Schema, Model, Document, Types } from "mongoose";

export interface IReviewDocument extends Document {
  _id: Types.ObjectId;
  user_id: string;
  user_name: string;
  user_image: string;
  food_id: Types.ObjectId | string;
  order_id: string;
  order_number: string;
  rating: number;
  message: string;
  images: { url: string; public_id: string }[];
  status: "visible" | "hidden";
  createdAt: Date;
  updatedAt: Date;
}

const reviewImageSchema = new Schema(
  { url: { type: String, required: true }, public_id: { type: String, default: "" } },
  { _id: false },
);

const reviewSchema = new Schema<IReviewDocument>(
  {
    user_id: { type: String, required: true, index: true },
    // স্ন্যাপশট — কাস্টমার পরে নাম/ছবি বদলালেও পুরোনো রিভিউ যেমন ছিল তেমনই থাকে
    user_name: { type: String, default: "", trim: true },
    user_image: { type: String, default: "" },

    food_id: { type: Schema.Types.ObjectId, ref: "Food", required: true, index: true },
    order_id: { type: String, default: "" },
    order_number: { type: String, default: "", trim: true },

    rating: { type: Number, required: true, min: 1, max: 5 },
    message: { type: String, default: "", trim: true, maxlength: 1000 },
    images: { type: [reviewImageSchema], default: [] },

    status: { type: String, enum: ["visible", "hidden"], default: "visible" },
  },
  { timestamps: true },
);

// একই খাবারের একই অর্ডারে একজন কাস্টমার একটাই রিভিউ দিতে পারে
reviewSchema.index({ user_id: 1, food_id: 1, order_id: 1 }, { unique: true });
reviewSchema.index({ food_id: 1, createdAt: -1 });

const ReviewModel: Model<IReviewDocument> =
  (mongoose.models.Review as Model<IReviewDocument>) ||
  mongoose.model<IReviewDocument>("Review", reviewSchema);

export default ReviewModel;
