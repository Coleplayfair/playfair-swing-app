import { createFileRoute } from "@tanstack/react-router";

const PLACES_BASE = "https://places.googleapis.com/v1";

async function resolvePhotoName(name: string, lat: number | null, lng: number | null, key: string): Promise<string | null> {
  const body: any = { textQuery: `${name} golf course` };
  if (lat != null && lng != null) {
    body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 5000 } };
  }
  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.displayName,places.photos",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const json: any = await res.json();
  const photo = json?.places?.[0]?.photos?.[0]?.name;
  return photo || null;
}

export const Route = createFileRoute("/api/public/course-photo/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const key = process.env.GOOGLE_API_KEY;
        if (!key) return new Response("no key", { status: 500 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const c = await supabaseAdmin.from("courses_cache").select("*").eq("id", params.id).maybeSingle();
        if (!c.data) return new Response("not found", { status: 404 });

        let photoName: string | null = c.data.photo_name;
        if (!photoName && !c.data.photo_checked_at) {
          const label = [c.data.name, c.data.club_name].filter(Boolean).join(" ");
          photoName = await resolvePhotoName(label, c.data.latitude, c.data.longitude, key);
          await supabaseAdmin.from("courses_cache").update({
            photo_name: photoName,
            photo_checked_at: new Date().toISOString(),
          }).eq("id", params.id);
        }
        if (!photoName) return new Response("no photo", { status: 404 });

        // Fetch media URL (skipHttpRedirect returns JSON with the actual URL)
        const mediaRes = await fetch(
          `${PLACES_BASE}/${photoName}/media?maxWidthPx=800&skipHttpRedirect=true`,
          { headers: { "X-Goog-Api-Key": key } }
        );
        if (!mediaRes.ok) return new Response("photo fetch failed", { status: 502 });
        const mediaJson: any = await mediaRes.json();
        const url = mediaJson?.photoUri;
        if (!url) return new Response("no uri", { status: 502 });
        return new Response(null, {
          status: 302,
          headers: { Location: url, "Cache-Control": "public, max-age=86400" },
        });
      },
    },
  },
});
