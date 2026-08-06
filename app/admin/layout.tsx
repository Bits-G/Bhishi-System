import Sidebar from "@/components/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar portal="admin" portalLabel="Admin Panel" />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
