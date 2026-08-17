import AddVideoBlog from "../../components/DashBoard/AddVideoBlog/AddVideoBlog";
import BreadcrumbLink from "@/src/app/Layout/Admin/BreadcrumbLink/BreadcrumbLink";


const VideoBlog = () => {
  return (
    <>
      <BreadcrumbLink
        items={[
          { label: "Video Blog", href: "/dashboard/add-video-blog" },
          { label: "All Video Blogs" },
        ]}
      />
      <AddVideoBlog />
    </>
  );
};

export default VideoBlog;
