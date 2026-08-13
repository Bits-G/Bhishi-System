"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, Trash2, ImageIcon, Video, Folder, ArrowLeft, Maximize2, X, Pencil, Check } from "lucide-react";

type GalleryItem = {
  id: number;
  month: string;
  type: "photo" | "video";
  url: string;
  public_id: string;
  caption: string;
};

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, 7 + i, 1); // Aug 2026 -> July 2027
  return d.toLocaleString("default", { month: "long", year: "numeric" });
});

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export default function GalleryBoard({ canManage = false }: { canManage?: boolean }) {
  const supabase = createClient();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCaption, setEditCaption] = useState("");

  async function loadGallery() {
    const { data } = await supabase.from("gallery").select("*").order("uploaded_at", { ascending: false });
    setItems((data as GalleryItem[]) ?? []);
  }

  useEffect(() => {
    loadGallery();
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !openMonth) return;

    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      alert("Cloudinary is not configured yet. Add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET to .env.local");
      return;
    }

    const isVideo = file.type.startsWith("video");
    setUploading(true);
    setProgressText(`Uploading ${isVideo ? "video" : "photo"}...`);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const resourceType = isVideo ? "video" : "image";
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    if (!res.ok) {
      setUploading(false);
      alert(data.error?.message ?? "Upload failed");
      return;
    }

    // Uploads always go into whichever month-folder is currently open — no need to
    // re-select the month, it's implied by the folder you're standing in.
    await supabase.from("gallery").insert({
      month: openMonth,
      type: isVideo ? "video" : "photo",
      url: data.secure_url,
      public_id: data.public_id,
      caption,
    });

    setUploading(false);
    setProgressText("");
    setCaption("");
    loadGallery();
  }

  async function handleDelete(item: GalleryItem) {
    if (!confirm("Delete this media item?")) return;
    // Note: this only removes the DB record. To also delete from Cloudinary, add a
    // server-side API route using your Cloudinary API Secret (never expose it client-side).
    await supabase.from("gallery").delete().eq("id", item.id);
    loadGallery();
  }

  async function saveCaption(item: GalleryItem) {
    await supabase.from("gallery").update({ caption: editCaption }).eq("id", item.id);
    setEditingId(null);
    loadGallery();
  }

  function countForMonth(m: string) {
    return items.filter((i) => i.month === m).length;
  }

  const monthItems = openMonth ? items.filter((i) => i.month === openMonth) : [];

  // ---------- FOLDER (root) VIEW ----------
  if (!openMonth) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-ink-900 mb-1">Gallery</h1>
        <p className="text-ink-700/60 mb-6">Pick a month to view or upload photos and video reels from that event.</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {MONTHS.map((m) => (
            <button
              key={m}
              onClick={() => setOpenMonth(m)}
              className="card text-left hover:shadow-soft transition flex flex-col items-start gap-2"
            >
              <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white">
                <Folder size={22} />
              </div>
              <p className="font-semibold text-ink-900">{m}</p>
              <p className="text-xs text-ink-700/50">{countForMonth(m)} item{countForMonth(m) === 1 ? "" : "s"}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---------- INSIDE A MONTH FOLDER ----------
  return (
    <div>
      <button
        onClick={() => setOpenMonth(null)}
        className="text-brand-700 text-sm font-medium flex items-center gap-1 mb-4 hover:underline"
      >
        <ArrowLeft size={16} /> Back to all months
      </button>

      <h1 className="text-2xl font-bold text-ink-900 mb-1">Gallery — {openMonth}</h1>
      <p className="text-ink-700/60 mb-6">{monthItems.length} item{monthItems.length === 1 ? "" : "s"} in this month.</p>

      {canManage && (
        <div className="card mb-6">
          <div className="flex flex-wrap gap-3 mb-3">
            <input
              className="input flex-1 min-w-[200px]"
              placeholder="Caption (optional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>
          <label className="btn-primary inline-flex items-center gap-2 cursor-pointer">
            <Upload size={18} /> {uploading ? progressText : `Upload Photo / Video to ${openMonth}`}
            <input type="file" accept="image/*,video/*" onChange={handleUpload} disabled={uploading} className="hidden" />
          </label>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {monthItems.map((item) => (
          <div key={item.id} className="card p-2 relative group">
            {item.type === "photo" ? (
              <div className="relative">
                <img
                  src={item.url}
                  alt={item.caption}
                  onClick={() => setLightboxItem(item)}
                  className="w-full h-36 object-cover rounded-lg cursor-pointer"
                />
                <button
                  onClick={() => setLightboxItem(item)}
                  className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-md"
                  title="View full size"
                >
                  <Maximize2 size={14} />
                </button>
              </div>
            ) : (
              <video src={item.url} controls className="w-full h-36 object-cover rounded-lg" />
            )}
            <div className="flex items-center justify-between mt-2 px-1">
              <span className="text-xs text-ink-700/60 flex items-center gap-1">
                {item.type === "photo" ? <ImageIcon size={12} /> : <Video size={12} />} {item.type}
              </span>
              {canManage && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingId(item.id);
                      setEditCaption(item.caption ?? "");
                    }}
                    className="text-brand-700"
                    title="Edit caption"
                  >
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(item)} className="text-rose-600" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
            {editingId === item.id ? (
              <div className="flex items-center gap-1 px-1 mt-1">
                <input
                  className="input py-1 text-xs flex-1"
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  autoFocus
                />
                <button onClick={() => saveCaption(item)} className="text-emerald-600"><Check size={14} /></button>
                <button onClick={() => setEditingId(null)} className="text-ink-700/50"><X size={14} /></button>
              </div>
            ) : (
              item.caption && <p className="text-xs text-ink-700/70 px-1 mt-0.5">{item.caption}</p>
            )}
          </div>
        ))}
        {monthItems.length === 0 && <p className="text-ink-700/50 text-sm col-span-full">No media uploaded for {openMonth} yet.</p>}
      </div>

      {/* Lightbox for enlarged photo view */}
      {lightboxItem && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6"
          onClick={() => setLightboxItem(null)}
        >
          <button className="absolute top-5 right-5 text-white" onClick={() => setLightboxItem(null)}>
            <X size={28} />
          </button>
          <img
            src={lightboxItem.url}
            alt={lightboxItem.caption}
            className="max-w-full max-h-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
