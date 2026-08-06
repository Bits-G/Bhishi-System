import Sidebar from "@/components/Sidebar";

export default function MasterAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar portal="master-admin" portalLabel="Master Admin" />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
