import Categories from "@/src/app/components/DashBoard/Menu/Categories/Categories";
import FoodVariation from "@/src/app/components/DashBoard/Menu/Variation/FoodVariation";
import BreadcrumbLink from "@/src/app/Layout/Admin/BreadcrumbLink/BreadcrumbLink";



const FoodVariationPage = () => {
  return (
    <>
      <BreadcrumbLink
        items={[
          { label: "Categories", href: "/dashboard/categories" },
          { label: "All Categories" },
        ]}
      />
      <FoodVariation/>
    </>
  );
};

export default FoodVariationPage;
