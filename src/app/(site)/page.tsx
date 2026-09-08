import HeroBanner from "../components/Clients/Banner/HeroBanner";
import FoodCategory from "../components/Clients/FoodCategory/FoodCategory";
import ShowFoodItems from "../components/Clients/FoodItems/ShowFoodItems";
import VideoBlog from "../components/Clients/VideoBlog/VideoBlog";
import StatsSection from "../components/Clients/StatsSection/StatsSection";

/**
 * হোমপেজ — খাবারই মূল কথা।
 *
 * উপরে হিরো ব্যানার আর নিচের দিকে ভিডিও ব্লগ — দুটোই ড্যাশবোর্ডের
 * "Website" মেনু থেকে আসে। কোনোটার কনটেন্ট না থাকলে সেই সেকশনটা
 * নিজে থেকেই লুকিয়ে থাকে, পেজ ফাঁকা দেখায় না।
 */
export default function Home() {
  return (
    <div>
      <HeroBanner />
      <FoodCategory />
      <ShowFoodItems />
      <VideoBlog />
      <StatsSection />
    </div>
  );
}
