import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <main className="flex-1 pb-20 lg:pb-0">
        {children}
      </main>
      
      {/* Mobile/Tablet Bottom Nav */}
      <BottomNav />
    </div>
  );
}
