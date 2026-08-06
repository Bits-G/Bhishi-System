import Sidebar from "@/components/Sidebar";

export default function ViewerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar portal="" portalLabel="Public Viewer Site" />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
