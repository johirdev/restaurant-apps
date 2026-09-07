import FoodCategory from "../components/Clients/FoodCategory/FoodCategory";
import ShowFoodItems from "../components/Clients/FoodItems/ShowFoodItems";
import StatsSection from "../components/Clients/StatsSection/StatsSection";

/**
 * হোমপেজ — খাবারই মূল কথা।
 * (হিরো ব্যানার, ডিসকাউন্ট ব্যানার আর ভিডিও ব্লগ সরিয়ে দেওয়া হয়েছে;
 *  রেস্টুরেন্ট ম্যানেজমেন্টের কাজে ওগুলোর দরকার ছিল না।)
 */
export default function Home() {
  return (
    <div>
      <FoodCategory />
      <ShowFoodItems />
      <StatsSection />
    </div>
  );
}
