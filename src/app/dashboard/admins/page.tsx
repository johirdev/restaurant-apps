
import { AllAdmin } from '@/app/components/DashBoard/Admins/AllAdmins/AllAdmin'
import BreadcrumbLink from '@/app/Layout/Admin/BreadcrumbLink/BreadcrumbLink'

const AllAdminsPage = () => {
  return (
    <>
   <BreadcrumbLink items={[{ label: "Admins", href: "/dashboard/all-admin" }, { label: "All Admin" }]} />
   <AllAdmin/>
   </>
  )
}

export default AllAdminsPage