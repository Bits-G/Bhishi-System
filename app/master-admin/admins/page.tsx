"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserPlus, Trash2, ShieldCheck, X } from "lucide-react";

type Admin = { id: string; full_name: string; role: string; created_at: string };

export default function ManageAdminsPage() {
  const supabase = createClient();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadAdmins() {
    const { data } = await supabase.from("profiles").select("*").eq("role", "admin").order("created_at", { ascending: false });
    setAdmins(data ?? []);
  }

  useEffect(() => {
    loadAdmins();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/create-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error);
      return;
    }
    setShowModal(false);
    setForm({ full_name: "", email: "", password: "" });
    loadAdmins();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this admin? They will lose portal access immediately.")) return;
    await fetch("/api/delete-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ admin_id: id }),
    });
    loadAdmins();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Manage Admins</h1>
          <p className="text-ink-700/60">Create and control who can manage the Bhishi data.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <UserPlus size={18} /> Create Admin
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {admins.map((a) => (
          <div key={a.id} className="card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                {a.full_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-ink-900">{a.full_name}</p>
                <p className="text-xs text-brand-700 flex items-center gap-1">
                  <ShieldCheck size={14} /> Admin
                </p>
              </div>
            </div>
            <p className="text-xs text-ink-700/50 mb-3">
              Added on {new Date(a.created_at).toLocaleDateString()}
            </p>
            <button
              onClick={() => handleDelete(a.id)}
              className="text-rose-600 text-sm font-medium flex items-center gap-1 hover:underline"
            >
              <Trash2 size={14} /> Remove Access
            </button>
          </div>
        ))}
        {admins.length === 0 && (
          <p className="text-ink-700/50 text-sm">No admins created yet. Click "Create Admin" to add one.</p>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl2 shadow-soft p-6 w-full max-w-md relative">
            <button onClick={() => setShowModal(false)} className="absolute right-4 top-4 text-ink-700/50">
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold mb-4">Create New Admin</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                required
                placeholder="Full Name"
                className="input"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
              <input
                required
                type="email"
                placeholder="Email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <input
                required
                type="password"
                placeholder="Temporary Password"
                className="input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              {error && <p className="text-rose-600 text-sm">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Creating..." : "Create Admin"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
