import VideoBlogManager from "@/src/app/components/DashBoard/VideoBlog/VideoBlogManager";
import BreadcrumbLink from "@/src/app/Layout/Admin/BreadcrumbLink/BreadcrumbLink";

const VideosPage = () => {
  return (
    <>
      <BreadcrumbLink
        items={[
          { label: "Website", href: "/dashboard/banners" },
          { label: "Video blog" },
        ]}
      />
      <VideoBlogManager />
    </>
  );
};

export default VideosPage;
