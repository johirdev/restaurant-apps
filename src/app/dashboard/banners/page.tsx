import Banners from "../../components/DashBoard/Banners/Banners";
import BreadcrumbLink from "@/src/app/Layout/Admin/BreadcrumbLink/BreadcrumbLink";


const BannerPage = () => {
  return (
    <>
      <BreadcrumbLink
        items={[
          { label: "Banners", href: "/dashboard/banners" },
          { label: "All Banners" },
        ]}
      />
      <Banners />
    </>
  );
};

export default BannerPage;
