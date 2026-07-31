import { Document, Types } from "mongoose";

export type CategorySubTitle = "" | "New" | "Hot" | "Popular";
export type CategoryStatus = "active" | "inactive";

/** Plain shape of a Category — used for create/update payloads. */
export interface ICategory {
  image?: string;
  image_public_id?: string;
  name: string; // only required field
  sub_title?: CategorySubTitle;
  slug?: string;
  sort_order?: number;
  status?: CategoryStatus;
}

/** Mongoose document shape (adds _id, timestamps). */
export interface ICategoryDocument extends ICategory, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/** Payload accepted by PATCH /api/v1/categories/:id — partial update. */
export type ICategoryUpdate = Partial<ICategory>;
