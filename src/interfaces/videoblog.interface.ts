import { Document, Types } from "mongoose";

export type VideoPlatform =
  | "youtube"
  | "facebook"
  | "vimeo"
  | "tiktok"
  | "instagram"
  | "dailymotion"
  | "other";

export type VideoBlogStatus = "active" | "inactive";

/**
 * Plain shape of a VideoBlog — used for create/update payloads.
 * video_url, embed_url and platform are required; the frontend derives
 * embed_url/platform/thumbnail from whatever link the admin pastes,
 * so this API just stores what it's given rather than re-parsing it.
 */
export interface IVideoBlog {
  video_url: string; // the original link the admin pasted
  embed_url: string; // iframe-embeddable URL derived from video_url
  platform: VideoPlatform;

  thumbnail?: string;
  thumbnail_public_id?: string;

  title?: string;
  description?: string;

  sort_order?: number;
  status?: VideoBlogStatus;
}

export interface IVideoBlogDocument extends IVideoBlog, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type IVideoBlogUpdate = Partial<IVideoBlog>;
