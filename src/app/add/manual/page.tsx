import { BackButton } from "@/components/BackButton";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { readAddParams, type AddSearchParams } from "@/lib/addParams";
import { emptyDraft } from "@/lib/types";
import { FoodForm } from "@/components/FoodForm";
import { ChevronLeft } from "@/components/icons";

export default async function ManualEntry({ searchParams }: { searchParams: AddSearchParams }) {
  await requireUser();
  const { meal, date, today, qs } = await readAddParams(searchParams);
  return (
    <main className="page no-nav">
      <header className="topbar">
        <BackButton fallback={`/add?${qs}`} />
        <h1 style={{ fontSize: 24 }}>Enter manually</h1>
      </header>
      <FoodForm initial={emptyDraft("manual")} meal={meal} date={date} today={today} />
    </main>
  );
}
