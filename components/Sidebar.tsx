"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UploadCloud,
  CalendarCheck,
  BookOpen,
  Image as ImageIcon,
  Wallet,
  Trophy,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type NavItem = { label: string; href: string; icon: React.ElementType };

const operationalNav: NavItem[] = [
  { label: "Attendance", href: "/attendance", icon: CalendarCheck },
  { label: "Topics / Events", href: "/events", icon: BookOpen },
  { label: "Gallery", href: "/gallery", icon: ImageIcon },
  { label: "Payments (Paid/Unpaid)", href: "/payments", icon: Wallet },
  { label: "Winners of the Month", href: "/winners", icon: Trophy },
];

export default function Sidebar({
  portal,
  portalLabel,
}: {
  portal: "master-admin" | "admin" | "";
  portalLabel: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const prefix = portal ? `/${portal}` : "";

  let nav: NavItem[] = [];
  if (portal === "master-admin") {
    nav = [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Manage Admins", href: "/admins", icon: ShieldCheck },
      { label: "Import Members", href: "/members", icon: UploadCloud },
      { label: "Members", href: "/members-list", icon: Users },
      ...operationalNav,
    ];
  } else if (portal === "admin") {
    nav = [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Members", href: "/members", icon: Users },
      ...operationalNav,
    ];
  } else {
    nav = [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Members", href: "/members", icon: Users },
      ...operationalNav,
    ];
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="w-64 min-h-screen bg-gradient-to-b from-brand-950 to-ink-900 text-white flex flex-col shrink-0">
      <div className="px-5 py-6 border-b border-white/10">
        <p className="text-xs uppercase tracking-widest text-brand-300 font-semibold">Wani Summit</p>
        <p className="text-lg font-bold">{portalLabel}</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map((item) => {
          const href = `${prefix}${item.href}`;
          const active = pathname === href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                active ? "bg-brand-600 text-white shadow-soft" : "text-brand-100/80 hover:bg-white/10"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {portal && (
        <button
          onClick={handleLogout}
          className="mx-3 mb-5 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-200 hover:bg-rose-500/20 transition"
        >
          <LogOut size={18} />
          Logout
        </button>
      )}
    </aside>
  );
}

