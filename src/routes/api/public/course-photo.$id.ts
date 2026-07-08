import { createFileRoute } from "@tanstack/react-router";

const PLACES_BASE = "https://places.googleapis.com/v1";

async function resolvePhotoName(name: string, lat: number | null, lng: number | null, key: string): Promise<string | null> {
  const body: any = { textQuery: `${name} golf course` };
  if (lat != null && lng != null) {
    body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 8000 } };
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
  return json?.places?.[0]?.photos?.[0]?.name || null;
}

export const Route = createFileRoute("/api/public/course-photo/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const key = process.env.GOOGLE_API_KEY;
        if (!key) return new Response("no key", { status: 500 });
        const url = new URL(request.url);
        const qName = url.searchParams.get("name");
        const qLat = url.searchParams.get("lat");
        const qLng = url.searchParams.get("lng");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const c = await supabaseAdmin.from("courses_cache").select("id,name,club_name,latitude,longitude,photo_name,photo_checked_at").eq("id", params.id).maybeSingle();

        let photoName: string | null = c.data?.photo_name ?? null;
        const alreadyChecked = !!c.data?.photo_checked_at;

        if (!photoName && !alreadyChecked) {
          const label = c.data
            ? [c.data.name, c.data.club_name].filter(Boolean).join(" ")
            : qName || "";
          const lat = c.data?.latitude ?? (qLat ? Number(qLat) : null);
          const lng = c.data?.longitude ?? (qLng ? Number(qLng) : null);
          if (label) {
            photoName = await resolvePhotoName(label, lat, lng, key);
            if (c.data) {
              await supabaseAdmin.from("courses_cache").update({
                photo_name: photoName,
                photo_checked_at: new Date().toISOString(),
              }).eq("id", params.id);
            }
          }
        }

        if (!photoName) return new Response("no photo", { status: 404 });

        const mediaRes = await fetch(
          `${PLACES_BASE}/${photoName}/media?maxWidthPx=800&skipHttpRedirect=true`,
          { headers: { "X-Goog-Api-Key": key } }
        );
        if (!mediaRes.ok) return new Response("photo fetch failed", { status: 502 });
        const mediaJson: any = await mediaRes.json();
        const target = mediaJson?.photoUri;
        if (!target) return new Response("no uri", { status: 502 });
        return new Response(null, {
          status: 302,
          headers: { Location: target, "Cache-Control": "public, max-age=86400" },
        });
      },
    },
  },
});
