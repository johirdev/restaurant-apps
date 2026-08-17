// src/app/foods/[id]/page.tsx
import type { Metadata } from "next";
import FoodDetails from "@/src/app/components/Clients/FoodDetails/FoodDetails";
import type {
  Food,
  FoodApiResponse,
} from "./FoodDetails.types";


async function getFood(id: string): Promise<Food | null> {
  try {
    const res = await fetch(`/api/v1/foods/${id}`, {
      next: { revalidate: 60 },
    });
    console.log(res, "get food singel view");
    if (!res.ok) return null;
    const json: FoodApiResponse = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const food = await getFood(id);

  if (!food) {
    return { title: "Item Not Found | Menu" };
  }

  const activeVariation =
    food.variations.find((v) => v.is_default) || food.variations[0];
  const price = activeVariation?.salePrice ?? activeVariation?.regularPrice;

  const description = `Order ${food.name} from our ${food.category_name} menu${
    price ? ` — starting at ৳${price}` : ""
  }. Freshly prepared, made to order.`;

  return {
    title: `${food.name} | ${food.category_name} — Order Online`,
    description,
    openGraph: {
      title: food.name,
      description,
      type: "website",
      images: food.image
        ? [{ url: food.image, width: 1200, height: 630, alt: food.name }]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: food.name,
      description,
      images: food.image ? [food.image] : [],
    },
    alternates: {
      canonical: `/foods/${food._id}`,
    },
  };
}

export default async function FoodDetailsPage({ params }: Props) {
  const { id } = await params;
  const food = await getFood(id);

  const activeVariation = food
    ? food.variations.find((v) => v.is_default) || food.variations[0]
    : null;

  const jsonLd = food
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: food.name,
        image: food.image,
        category: food.category_name,
        offers: activeVariation
          ? {
              "@type": "Offer",
              priceCurrency: "BDT",
              price: activeVariation.salePrice,
              availability:
                activeVariation.stock_quantity > 0
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
            }
          : undefined,
      }
    : null;

  return (
    <div>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <FoodDetails id={id} initialFood={food} />
    </div>
  );
}
