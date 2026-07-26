import { AdminCreate } from "@/src/app/components/DashBoard/Admins/CreateAdmin/AdminCreate";
import BreadcrumbLink from "@/src/app/Layout/Admin/BreadcrumbLink/BreadcrumbLink";

const AdminCreatePage = () => {
  return (
    <>
      <BreadcrumbLink
        items={[
          { label: "Admins", href: "/dashboard/all-admin" },
          { label: "Create Admin" },
        ]}
      />
      <AdminCreate />
    </>
  );
};

export default AdminCreatePage;
