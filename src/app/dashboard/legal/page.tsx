import LegalPagesManager from "@/src/app/components/DashBoard/Legal/LegalPagesManager";
import BreadcrumbLink from "@/src/app/Layout/Admin/BreadcrumbLink/BreadcrumbLink";

const LegalPagesRoute = () => {
  return (
    <>
      <BreadcrumbLink
        items={[
          { label: "Website", href: "/dashboard/banners" },
          { label: "Legal pages" },
        ]}
      />
      <LegalPagesManager />
    </>
  );
};

export default LegalPagesRoute;
