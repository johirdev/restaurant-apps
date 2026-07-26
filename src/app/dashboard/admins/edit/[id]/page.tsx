import { EditAdmin } from "@/src/app/components/DashBoard/Admins/CreateAdmin/EditAdmin";
import BreadcrumbLink from "@/src/app/Layout/Admin/BreadcrumbLink/BreadcrumbLink";

const EditAdminPage = () => {
  return (
    <div>
      <BreadcrumbLink
        items={[
          { label: "Admins", href: "/dashboard/all-admin" },
          { label: "All Admins", href: "/dashboard/all-admin" },
          { label: "Edit Admin" },
        ]}
      />
      <EditAdmin />
    </div>
  );
};

export default EditAdminPage;
