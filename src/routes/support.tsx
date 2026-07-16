import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — Playfair" },
      { name: "description", content: "Get help with Playfair — contact support and FAQs." },
      { property: "og:title", content: "Support — Playfair" },
      { property: "og:url", content: "https://playfair-swing-app.lovable.app/support" },
    ],
    links: [{ rel: "canonical", href: "https://playfair-swing-app.lovable.app/support" }],
  }),
  component: SupportPage,
});

function SupportPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-foreground">
      <Link to="/" className="text-sm text-muted-foreground hover:underline">← Back</Link>
      <h1 className="mt-6 text-3xl font-bold">Support</h1>
      <p className="mt-2 text-sm text-muted-foreground">We usually reply within one business day.</p>

      <section className="mt-8 space-y-4 text-sm leading-relaxed">
        <div className="rounded-lg border border-border p-5">
          <h2 className="text-lg font-semibold">Contact</h2>
          <p className="mt-2">Email: <a className="underline" href="mailto:support@playfair.app">support@playfair.app</a></p>
          <p>Website: <a className="underline" href="https://playfair-swing-app.lovable.app">playfair-swing-app.lovable.app</a></p>
        </div>

        <h2 className="text-lg font-semibold mt-8">FAQ</h2>

        <div>
          <h3 className="font-semibold">How do I add a buddy?</h3>
          <p>Open a round, tap Add Player, then search by name or share the QR / link with them.</p>
        </div>
        <div>
          <h3 className="font-semibold">Does GPS work offline?</h3>
          <p>Yes — once a course is loaded, distances work without a data connection. Scores sync when you're back online.</p>
        </div>
        <div>
          <h3 className="font-semibold">How do I delete my account?</h3>
          <p>Go to Me → Settings → Delete account, or email support@playfair.app.</p>
        </div>
        <div>
          <h3 className="font-semibold">Is my location shared with other players?</h3>
          <p>Only when you enable "Go Live" for a round. Otherwise it's used privately for distance and stats.</p>
        </div>
      </section>
    </main>
  );
}
