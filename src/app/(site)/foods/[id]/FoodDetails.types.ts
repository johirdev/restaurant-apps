// src/app/components/Clients/FoodDetails/FoodDetails.types.ts

export interface FoodImage {
  url: string;
  public_id: string;
}

export interface FoodVariation {
  _id: string;
  name: string;
  sku: string;
  barcode: string;
  regularPrice: number;
  salePrice: number;
  images: FoodImage[];
  preparationTime: number;
  discountType: "flat" | "percentage";
  discountValue: number;
  quantityLabel: string;
  isOpen: boolean;
  kitchen_chef: string;
  spice_level: string;
  stock_quantity: number;
  is_default: boolean;
  sort_order: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface Food {
  _id: string;
  name: string;
  category_id: string;
  category_name: string;
  image: string;
  image_public_id?: string;
  status: "active" | "inactive";
  variations: FoodVariation[];
  createdAt: string;
  updatedAt: string;
}

export interface FoodApiResponse {
  success: boolean;
  message: string;
  data: Food;
}