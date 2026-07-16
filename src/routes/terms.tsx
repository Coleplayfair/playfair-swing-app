import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Playfair" },
      { name: "description", content: "The terms that govern your use of Playfair." },
      { property: "og:title", content: "Terms of Service — Playfair" },
      { property: "og:url", content: "https://playfair-swing-app.lovable.app/terms" },
    ],
    links: [{ rel: "canonical", href: "https://playfair-swing-app.lovable.app/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-foreground">
      <Link to="/" className="text-sm text-muted-foreground hover:underline">← Back</Link>
      <h1 className="mt-6 text-3xl font-bold">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: July 16, 2026</p>

      <section className="mt-8 space-y-4 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold mt-6">1. Your account</h2>
        <p>You must be at least 13 years old to use Playfair. You are responsible for the activity on your account and for keeping your credentials secure.</p>

        <h2 className="text-lg font-semibold mt-6">2. Acceptable use</h2>
        <p>Don't misuse the service: no scraping, no reselling, no reverse engineering, no uploading illegal or harmful content, and no interfering with other users.</p>

        <h2 className="text-lg font-semibold mt-6">3. Your content</h2>
        <p>You retain ownership of the rounds, scores, photos and notes you upload. You grant us a limited licence to host and display that content back to you and to people you share it with.</p>

        <h2 className="text-lg font-semibold mt-6">4. Venue bookings</h2>
        <p>Bookings for indoor bays and events are subject to the venue's cancellation policy shown at checkout.</p>

        <h2 className="text-lg font-semibold mt-6">5. Disclaimer</h2>
        <p>Playfair is provided "as is". GPS distances are estimates and shouldn't be relied on for anything safety-critical.</p>

        <h2 className="text-lg font-semibold mt-6">6. Termination</h2>
        <p>You can delete your account any time from the Me tab. We may suspend accounts that breach these terms.</p>

        <h2 className="text-lg font-semibold mt-6">7. Contact</h2>
        <p>Questions? Email <a className="underline" href="mailto:support@playfair.app">support@playfair.app</a>.</p>
      </section>
    </main>
  );
}
