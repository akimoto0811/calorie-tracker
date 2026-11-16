import { BackButton } from "@/components/BackButton";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { readAddParams, type AddSearchParams } from "@/lib/addParams";
import { ChevronLeft } from "@/components/icons";
import { ScanFlow } from "./ScanFlow";

export default async function ScanPage({ searchParams }: { searchParams: AddSearchParams }) {
  await requireUser();
  const { meal, date, today, qs } = await readAddParams(searchParams);
  return (
    <main className="page no-nav">
      <header className="topbar">
        <BackButton fallback={`/add?${qs}`} />
        <h1 style={{ fontSize: 24 }}>Scan barcode</h1>
      </header>
      <ScanFlow meal={meal} date={date} today={today} qs={qs} />
    </main>
  );
}
