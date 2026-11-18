import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { requireUser } from "@/lib/supabase/server";
import { amIAdmin } from "@/lib/queries";
import { BulkUpload } from "./BulkUpload";

export default async function ImportFoods() {
  const { supabase } = await requireUser();
  if (!(await amIAdmin(supabase))) notFound();
  return (
    <main className="page no-nav" style={{ gap: 16 }}>
      <header className="topbar">
        <BackButton fallback="/library" />
        <div className="grow">
          <h1 style={{ fontSize: 24 }}>Bulk upload</h1>
          <div className="muted small">Add many foods to the library from a spreadsheet</div>
        </div>
      </header>
      <BulkUpload remotePhotosEnabled={process.env.ENABLE_REMOTE_PHOTO_IMPORT === "true"} />
    </main>
  );
}
