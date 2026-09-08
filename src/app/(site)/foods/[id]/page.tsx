// src/app/foods/[id]/page.tsx

import type { Metadata } from "next";
import FoodDetails from "@/src/app/components/Clients/FoodDetails/FoodDetails";

import type { Food, FoodApiResponse } from "./FoodDetails.types";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://durbinbangla.vercel.app";

/**
 * Get Food Details
 */
async function getFood(id: string): Promise<Food | null> {
  try {
    const res = await fetch(
      `${siteUrl}/api/v1/foods/${encodeURIComponent(id)}`,
      {
        next: {
          revalidate: 60,
        },
      },
    );

    if (!res.ok) {
      return null;
    }

    const json: FoodApiResponse = await res.json();

    return json?.data ?? null;
  } catch (error) {
    console.error("Failed to fetch food:", error);

    return null;
  }
}

/**
 * Get the first available image
 *
 * Priority:
 * 1. Main food image
 * 2. Default variation first image
 * 3. First variation first image
 */
function getFoodImage(food: Food): string | null {
  if (food.image) {
    return food.image;
  }

  const defaultVariation = food.variations?.find(
    (variation) => variation.is_default,
  );

  if (defaultVariation?.images?.[0]?.url) {
    return defaultVariation.images[0].url;
  }

  const firstVariationImage = food.variations?.find(
    (variation) => variation.images?.[0]?.url,
  )?.images?.[0]?.url;

  return firstVariationImage ?? null;
}

/**
 * Get active/default variation
 */
function getActiveVariation(food: Food) {
  return (
    food.variations?.find((variation) => variation.is_default) ??
    food.variations?.[0]
  );
}

/**
 * Dynamic SEO Metadata
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const food = await getFood(id);

  /**
   * Food not found
   */
  if (!food) {
    return {
      title: "Food Not Found | Durbin Bangla Restaurants",
      description: "The food item you are looking for could not be found.",

      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const activeVariation = getActiveVariation(food);

  const price = activeVariation?.salePrice ?? activeVariation?.regularPrice;

  const image = getFoodImage(food);

  const title = `${food.name} | ${food.category_name}`;

  const description = price
    ? `Order ${food.name} from our ${food.category_name} menu. Starting from ৳${price}. Freshly prepared and made to order.`
    : `Order ${food.name} from our ${food.category_name} menu. Freshly prepared and made to order.`;

  const foodUrl = `${siteUrl}/foods/${food._id}`;

  return {
    /**
     * Browser / Google title
     */
    title,

    /**
     * Meta description
     */
    description,

    /**
     * Canonical URL
     */
    alternates: {
      canonical: `/foods/${food._id}`,
    },

    /**
     * Search engine indexing
     */
    robots: {
      index: true,
      follow: true,

      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-video-preview": -1,
        "max-snippet": -1,
      },
    },

    /**
     * Open Graph
     *
     * Facebook
     * LinkedIn
     * Messenger
     * WhatsApp
     * Other social crawlers
     */
    openGraph: {
      type: "website",

      url: foodUrl,

      siteName: "Durbin Bangla Restaurants",

      locale: "en_US",

      title,

      description,

      /**
       * IMPORTANT:
       * Food's first/main image will be used
       * when sharing the URL.
       */
      images: image
        ? [
            {
              url: image,
              width: 1200,
              height: 630,
              alt: `${food.name} - ${food.category_name}`,
            },
          ]
        : [],
    },

    /**
     * Twitter / X
     */
    twitter: {
      card: "summary_large_image",

      title,

      description,

      images: image ? [image] : [],
    },

    /**
     * Additional metadata
     */
    category: "food",

    keywords: [
      food.name,
      food.category_name,
      "food",
      "restaurant",
      "menu",
      "order food",
      "online food",
    ],

    authors: [
      {
        name: "Durbin Bangla Restaurants",
      },
    ],
  };
}

/**
 * Food Details Page
 */
export default async function FoodDetailsPage({ params }: Props) {
  const { id } = await params;

  const food = await getFood(id);

  /**
   * Get default/active variation
   */
  const activeVariation = food ? getActiveVariation(food) : null;

  /**
   * Get first food image
   */
  const foodImage = food ? getFoodImage(food) : null;

  /**
   * Product Structured Data
   */
  const jsonLd = food
    ? {
        "@context": "https://schema.org",
        "@type": "Product",

        name: food.name,

        description: `Order ${food.name} from ${food.category_name}.`,

        image: foodImage ? [foodImage] : [],

        category: food.category_name,

        sku: activeVariation?.sku,

        brand: {
          "@type": "Brand",
          name: "Durbin Bangla Restaurants",
        },

        offers: activeVariation
          ? {
              "@type": "Offer",

              url: `${siteUrl}/foods/${food._id}`,

              priceCurrency: "BDT",

              price: activeVariation.salePrice ?? activeVariation.regularPrice,

              availability:
                activeVariation.stock_quantity > 0
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",

              itemCondition: "https://schema.org/NewCondition",
            }
          : undefined,
      }
    : null;

  return (
    <>
      {/* Product JSON-LD */}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd),
          }}
        />
      )}

      {/* Food Details */}
      <FoodDetails id={id} initialFood={food} />
    </>
  );
}
