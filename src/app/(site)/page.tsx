import BannerClient from "../components/Clients/Banner/Banner";
import FoodCategory from "../components/Clients/FoodCategory/FoodCategory";
import ShowFoodItems from "../components/Clients/FoodItems/ShowFoodItems";

export default function Home() {
  return (
    <div className="min-h-[200vh]">
      <BannerClient />
      <FoodCategory />
      <ShowFoodItems />
    </div>
  );
}
