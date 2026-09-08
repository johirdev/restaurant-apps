import BannerManager from "@/src/app/components/DashBoard/Banner/BannerManager";
import BreadcrumbLink from "@/src/app/Layout/Admin/BreadcrumbLink/BreadcrumbLink";

const BannersPage = () => {
  return (
    <>
      <BreadcrumbLink
        items={[
          { label: "Website", href: "/dashboard/banners" },
          { label: "Hero banners" },
        ]}
      />
      <BannerManager />
    </>
  );
};

export default BannersPage;
