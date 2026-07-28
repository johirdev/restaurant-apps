import StaffManagement from "@/src/app/components/DashBoard/Admins/Staff/Staff";
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
      <StaffManagement />
    </>
  );
};

export default AllAdminsPage;
