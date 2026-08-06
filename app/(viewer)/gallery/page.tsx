import { createClient } from "@/lib/supabase/server";
import { ImageIcon, Video } from "lucide-react";

export default async function ViewerGalleryPage() {
  const supabase = createClient();
  const { data: items } = await supabase.from("gallery").select("*").order("uploaded_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900 mb-1">Gallery</h1>
      <p className="text-ink-700/60 mb-6">Photos &amp; video reels from Bhishi events.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items?.map((item: any) => (
          <div key={item.id} className="card p-2">
            {item.type === "photo" ? (
              <img src={item.url} alt={item.caption} className="w-full h-36 object-cover rounded-lg" />
            ) : (
              <video src={item.url} controls className="w-full h-36 object-cover rounded-lg" />
            )}
            <div className="flex items-center gap-1 mt-2 px-1 text-xs text-ink-700/60">
              {item.type === "photo" ? <ImageIcon size={12} /> : <Video size={12} />} {item.month}
            </div>
            {item.caption && <p className="text-xs text-ink-700/70 px-1 mt-0.5">{item.caption}</p>}
          </div>
        ))}
        {(!items || items.length === 0) && <p className="text-ink-700/50 text-sm col-span-full">No media uploaded yet.</p>}
      </div>
    </div>
  );
}
