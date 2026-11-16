import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy policy · Calorie Tracker" };

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" updated="16 November 2026">
      <p>
        Calorie Tracker is a small, invite-only app for a group of friends. It is not a commercial service and
        shows no ads. This page explains what it stores and why.
      </p>

      <h2>What we store</h2>
      <ul>
        <li>
          <b>Your account:</b> your email address and, if you sign in with Google, your name as shown on your
          Google account. We don&apos;t receive your Google password or access anything else in your Google account.
        </li>
        <li>
          <b>Your food log and goals:</b> what you eat, when, and your daily calorie and macro goals. Only you can
          see these.
        </li>
        <li>
          <b>Foods you share:</b> if you tick &ldquo;Share with the food library&rdquo;, that food (name, brand,
          nutrition values and any label photo) becomes visible to other members, along with your display name.
        </li>
        <li>
          <b>Label photos:</b> photos you take of nutrition labels are stored so the food can be checked. They are
          visible to signed-in members only.
        </li>
        <li>
          <b>Invites:</b> email addresses that members invite, so those people can sign up.
        </li>
      </ul>

      <h2>Who processes it</h2>
      <ul>
        <li>
          <b>Supabase</b> stores the data and handles sign-in.
        </li>
        <li>
          <b>Vercel</b> hosts the app.
        </li>
        <li>
          <b>Google Gemini</b> reads label photos when you use &ldquo;Snap nutrition label&rdquo;. Only the photo is
          sent, not your name or log.
        </li>
        <li>
          <b>Open Food Facts</b> is asked for product details when you scan a barcode. Only the barcode number is
          sent.
        </li>
      </ul>
      <p>Your data is never sold or used for advertising.</p>

      <h2>Deleting your data</h2>
      <p>
        You can remove log entries yourself at any time. To delete your whole account and everything in it, ask
        the person who runs this app (the person who invited you) and it will be removed.
      </p>
    </LegalPage>
  );
}
