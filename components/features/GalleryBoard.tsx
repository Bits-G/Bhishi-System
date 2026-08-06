"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, Trash2, ImageIcon, Video } from "lucide-react";

type GalleryItem = {
  id: number;
  month: string;
  type: "photo" | "video";
  url: string;
  public_id: string;
  caption: string;
};

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, i, 1);
  return d.toLocaleString("default", { month: "long", year: "numeric" });
});

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export default function GalleryBoard() {
  const supabase = createClient();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [month, setMonth] = useState(MONTHS[0]);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progressText, setProgressText] = useState("");

  async function loadGallery() {
    const { data } = await supabase.from("gallery").select("*").order("uploaded_at", { ascending: false });
    setItems((data as GalleryItem[]) ?? []);
  }

  useEffect(() => {
    loadGallery();
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

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

    await supabase.from("gallery").insert({
      month,
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900 mb-1">Gallery</h1>
      <p className="text-ink-700/60 mb-6">Upload photos and video reels from each month's Bhishi event.</p>

      <div className="card mb-6">
        <div className="flex flex-wrap gap-3 mb-3">
          <select className="input flex-1 min-w-[180px]" value={month} onChange={(e) => setMonth(e.target.value)}>
            {MONTHS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input
            className="input flex-1 min-w-[200px]"
            placeholder="Caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </div>
        <label className="btn-primary inline-flex items-center gap-2 cursor-pointer">
          <Upload size={18} /> {uploading ? progressText : "Upload Photo / Video"}
          <input type="file" accept="image/*,video/*" onChange={handleUpload} disabled={uploading} className="hidden" />
        </label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <div key={item.id} className="card p-2 relative group">
            {item.type === "photo" ? (
              <img src={item.url} alt={item.caption} className="w-full h-36 object-cover rounded-lg" />
            ) : (
              <video src={item.url} controls className="w-full h-36 object-cover rounded-lg" />
            )}
            <div className="flex items-center justify-between mt-2 px-1">
              <span className="text-xs text-ink-700/60 flex items-center gap-1">
                {item.type === "photo" ? <ImageIcon size={12} /> : <Video size={12} />} {item.month}
              </span>
              <button onClick={() => handleDelete(item)} className="text-rose-600">
                <Trash2 size={14} />
              </button>
            </div>
            {item.caption && <p className="text-xs text-ink-700/70 px-1 mt-0.5">{item.caption}</p>}
          </div>
        ))}
        {items.length === 0 && <p className="text-ink-700/50 text-sm col-span-full">No media uploaded yet.</p>}
      </div>
    </div>
  );
}
