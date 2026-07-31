import AdminManagement from "../../components/DashBoard/Admins/AdminManagement/AdminManagement";
import BreadcrumbLink from "@/src/app/Layout/Admin/BreadcrumbLink/BreadcrumbLink";


const AllAdminsPage = () => {
  return (
    <>
      <BreadcrumbLink
        items={[
          { label: "Admins", href: "/dashboard/all-admin" },
          { label: "All Admin" },
        ]}
      />
      <AdminManagement />
    </>
  );
};

export default AllAdminsPage;
