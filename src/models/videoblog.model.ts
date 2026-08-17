import mongoose, { Schema, Model } from "mongoose";
import { IVideoBlogDocument } from "../interfaces/videoblog.interface";


const videoBlogSchema = new Schema<IVideoBlogDocument>(
  {
    video_url: { type: String, required: true, trim: true },
    embed_url: { type: String, required: true, trim: true },
    platform: {
      type: String,
      enum: [
        "youtube",
        "facebook",
        "vimeo",
        "tiktok",
        "instagram",
        "dailymotion",
        "other",
      ],
      required: true,
    },

    thumbnail: { type: String, default: "" },
    thumbnail_public_id: { type: String, default: "" },

    title: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },

    sort_order: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true },
);

videoBlogSchema.index({ status: 1, sort_order: 1 });
videoBlogSchema.index({ platform: 1 });
videoBlogSchema.index({ title: "text", description: "text" });

const VideoBlogModel: Model<IVideoBlogDocument> =
  (mongoose.models.VideoBlog as Model<IVideoBlogDocument>) ||
  mongoose.model<IVideoBlogDocument>("VideoBlog", videoBlogSchema);

export default VideoBlogModel;
