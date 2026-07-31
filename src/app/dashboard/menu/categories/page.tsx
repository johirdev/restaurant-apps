import Categories from "@/src/app/components/DashBoard/Menu/Categories/Categories";
import BreadcrumbLink from "@/src/app/Layout/Admin/BreadcrumbLink/BreadcrumbLink";



const CategoriesPage = () => {
  return (
    <>
      <BreadcrumbLink
        items={[
          { label: "Categories", href: "/dashboard/categories" },
          { label: "All Categories" },
        ]}
      />
      <Categories/>
    </>
  );
};

export default CategoriesPage;
