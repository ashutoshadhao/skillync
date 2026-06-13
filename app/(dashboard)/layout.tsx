import { Sidebar } from "@/components/shared/Sidebar";
import { DashboardHeader } from "@/components/shared/Header";

type Props = {
  children: React.ReactNode;
};

const DashboardLayout = ({ children }: Props) => {
  return (
    <div className="bg-gray-50 min-h-screen">
      <Sidebar />
      <DashboardHeader />
      <main className="lg:pl-60 pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
