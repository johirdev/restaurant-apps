import FoodCreate from "@/src/app/components/DashBoard/Menu/FoodCreate/FoodCreate";
import BreadcrumbLink from "@/src/app/Layout/Admin/BreadcrumbLink/BreadcrumbLink";



const FoodCreatePage = () => {
  return (
    <>
      <BreadcrumbLink
        items={[
          { label: "Categories", href: "/dashboard/menu/food-create" },
          { label: "Create Food Item" },
        ]}
      />
      <FoodCreate />
    </>
  );
};

export default FoodCreatePage;
