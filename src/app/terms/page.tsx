import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of use · Calorie Tracker" };

export default function Terms() {
  return (
    <LegalPage title="Terms of use" updated="16 November 2026">
      <p>
        Calorie Tracker is a free, personal app shared among friends by invitation. By using it you agree to these
        simple terms.
      </p>
      <h2>Not medical advice</h2>
      <p>
        Nutrition values come from food labels, Open Food Facts, AI reading of photos, and other members. They can
        be wrong. Check anything important yourself, and talk to a doctor or dietitian about health decisions.
      </p>
      <h2>Be kind with shared foods</h2>
      <p>
        Only share foods with accurate information, and only upload photos of food labels. When you review a friend&apos;s
        food, check it honestly against the photo.
      </p>
      <h2>No guarantees</h2>
      <p>
        The app is provided as is, without any warranty. It may change, have downtime, or be shut down. Keep your
        own copy of anything you can&apos;t lose.
      </p>
      <h2>Access</h2>
      <p>Access is by invitation and can be removed at any time.</p>
      <p>
        See also the <a href="/privacy">privacy policy</a>.
      </p>
    </LegalPage>
  );
}
