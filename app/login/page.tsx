"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck, Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !data.user) {
      setError("Invalid email or password. Contact the Master Admin if you don't have access.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    setLoading(false);

    if (profile?.role === "master_admin") router.push("/master-admin");
    else if (profile?.role === "admin") router.push("/admin");
    else {
      setError("This account has no admin access.");
      await supabase.auth.signOut();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 text-white">
          <ShieldCheck className="mx-auto mb-2" size={40} />
          <h1 className="text-2xl font-bold">Wani Summit System</h1>
          <p className="text-brand-100 text-sm">Admin &amp; Master Admin Login</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-xl2 shadow-soft p-8 space-y-4">
          <div>
            <label className="text-sm font-medium text-ink-800">Email</label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-2.5 text-brand-400" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input pl-10"
                placeholder="you@wanisummit.com"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-ink-800">Password</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-2.5 text-brand-400" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pl-10"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && <p className="text-rose-600 text-sm font-medium">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center flex">
            {loading ? "Signing in..." : "Login"}
          </button>

          <p className="text-xs text-center text-ink-700/60 pt-2">
            Looking for the public Wani Summit website?{" "}
            <a href="/" className="text-brand-700 font-medium">
              Go to Viewer Site
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
