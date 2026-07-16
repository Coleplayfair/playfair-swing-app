import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Playfair" },
      { name: "description", content: "How Playfair collects, uses and protects your data." },
      { property: "og:title", content: "Privacy Policy — Playfair" },
      { property: "og:url", content: "https://playfair-swing-app.lovable.app/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://playfair-swing-app.lovable.app/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-foreground">
      <Link to="/" className="text-sm text-muted-foreground hover:underline">← Back</Link>
      <h1 className="mt-6 text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: July 16, 2026</p>

      <section className="mt-8 space-y-4 text-sm leading-relaxed">
        <p>This Privacy Policy explains how Playfair ("we", "us") collects, uses and protects your information when you use the Playfair mobile app and website.</p>

        <h2 className="text-lg font-semibold mt-6">1. Information we collect</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Account data</strong> — email, display name, avatar, handicap and profile you provide.</li>
          <li><strong>Round data</strong> — scores, stats, courses played, notes and photos you save.</li>
          <li><strong>Location</strong> — precise GPS while a round is active, for distance-to-pin and shot tracking. Location is used only while the app is open on a round.</li>
          <li><strong>Device data</strong> — device model, OS version, crash logs and anonymous performance metrics.</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6">2. How we use it</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Provide the core app: scoring, GPS, stats, buddies and venue booking.</li>
          <li>Sync your data across your devices.</li>
          <li>Improve reliability via crash reports and aggregate performance data.</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6">3. Sharing</h2>
        <p>We do not sell your data. We share data only with service providers that host our backend (database, auth, storage) under contract, and when required by law.</p>

        <h2 className="text-lg font-semibold mt-6">4. Your rights</h2>
        <p>You can access, export or delete your account and data at any time from the Me tab, or by emailing support@playfair.app.</p>

        <h2 className="text-lg font-semibold mt-6">5. Children</h2>
        <p>Playfair is not directed at children under 13. We do not knowingly collect data from children under 13.</p>

        <h2 className="text-lg font-semibold mt-6">6. Contact</h2>
        <p>Questions? Email <a className="underline" href="mailto:support@playfair.app">support@playfair.app</a>.</p>
      </section>
    </main>
  );
}
