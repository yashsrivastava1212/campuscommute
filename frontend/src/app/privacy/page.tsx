import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 prose prose-slate">
      <h1>Privacy Policy</h1>
      <p>CampusCommute is restricted to Goa Institute of Management students with @gim.ac.in email addresses.</p>
      <h2>Data We Collect</h2>
      <ul>
        <li>GIM email address for authentication</li>
        <li>Display name and optional phone number</li>
        <li>Carpool and trip coordination data</li>
      </ul>
      <h2>Contact Information</h2>
      <p>Phone numbers are encrypted at rest and shared only with carpool members who mutually opt in.</p>
      <h2>Data Retention</h2>
      <p>Completed carpools and discussions are archived and purged according to our retention policy.</p>
      <Link href="/login" className="text-brand-600">Back to login</Link>
    </main>
  );
}
