import BannerClient from "../components/Clients/Banner/Banner";
import DiscountBanners from "../components/Clients/DiscountBanner/DiscountBanners";
import FoodCategory from "../components/Clients/FoodCategory/FoodCategory";
import ShowFoodItems from "../components/Clients/FoodItems/ShowFoodItems";
import StatsSection from "../components/Clients/StatsSection/StatsSection";
import VideoBlogSlider from "../components/Clients/VideoBlogSlider/VideoBlogSlider";

export default function Home() {
  return (
    <div className="">
      <BannerClient />
      <FoodCategory />
      {/* ..dd */}
      <ShowFoodItems />
      <DiscountBanners />
      <VideoBlogSlider />
      <StatsSection />
    </div>
  );
}
