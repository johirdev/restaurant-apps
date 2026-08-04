import AllItems from "@/src/app/components/DashBoard/Menu/AllItems/AllItems";
import BreadcrumbLink from "@/src/app/Layout/Admin/BreadcrumbLink/BreadcrumbLink";



const AllItemsPage = () => {
  return (
    <>
      <BreadcrumbLink
        items={[
          { label: "Categories", href: "/dashboard/menu/all-items" },
          { label: "All Food Items" },
        ]}
      />
      <AllItems />
    </>
  );
};

export default AllItemsPage;
