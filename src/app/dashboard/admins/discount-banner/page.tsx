import DiscountBanner from "@/src/app/components/DashBoard/Admins/DiscountBanner/DiscountBanner";
import BreadcrumbLink from "@/src/app/Layout/Admin/BreadcrumbLink/BreadcrumbLink";


const DiscountBannerPage = () => {
  return (
    <>
      <BreadcrumbLink
        items={[
          {
            label: "Discount Banner",
            href: "/dashboard/admins/discount-banner",
          },
          { label: "All Discount Banners" },
        ]}
      />
      <DiscountBanner />
    </>
  );
};

export default DiscountBannerPage;
