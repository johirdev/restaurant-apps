/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Food {
  _id: string;
  name: string;
  category_id: string;
  category_name: string;
  description?: string;
  view?: number;
  total_review: number;
  review_rating: number;
  branch_id?: string;
  branch_name?: string;
  image?: string;
  image_public_id?: string;
  status: "active" | "inactive";
  variations: FoodVariation[];
  createdAt: string;
  updatedAt: string;
}

export interface FoodVariation {
  _id: string;
  name: string;
  sku: string;
  barcode: string;
  regularPrice: number;
  salePrice: number;
  images: { url: string; public_id: string }[];
  discountType?: "none" | "percentage" | "flat";
  discountValue?: number;
  quantityLabel?: string;
  isOpen?: boolean;
  kitchen_chef: string;
  spice_level?: string;
  stock_quantity: number;
  is_default: boolean;
  sort_order: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  preparationTime?: number; // ✅ Add this
}

export interface FoodApiResponse {
  success: boolean;
  message?: string;
  data: Food | null;
}
