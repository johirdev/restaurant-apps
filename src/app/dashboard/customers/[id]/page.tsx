import CustomerDetails from "@/src/app/components/DashBoard/Customers/CustomerDetails";

// Next 16 এ params একটা Promise — await না করলে টাইপ মিলবে না
type Props = { params: Promise<{ id: string }> };

export default async function DashboardCustomerDetailsPage({ params }: Props) {
  const { id } = await params;
  return <CustomerDetails id={id} />;
}
