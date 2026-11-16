import { BackButton } from "@/components/BackButton";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { readAddParams, type AddSearchParams } from "@/lib/addParams";
import { ChevronLeft } from "@/components/icons";
import { LabelFlow } from "./LabelFlow";

export default async function LabelPage({ searchParams }: { searchParams: AddSearchParams }) {
  const { user } = await requireUser();
  const { meal, date, today, qs } = await readAddParams(searchParams);
  return (
    <main className="page no-nav">
      <header className="topbar">
        <BackButton fallback={`/add?${qs}`} />
        <h1 style={{ fontSize: 24 }}>Snap nutrition label</h1>
      </header>
      <LabelFlow userId={user.id} meal={meal} date={date} today={today} />
    </main>
  );
}
