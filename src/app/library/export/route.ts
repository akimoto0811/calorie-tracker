import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { amIAdmin } from "@/lib/queries";
import { libraryCsv } from "@/lib/foodImport";

/** Download the whole shared library as a CSV (app owner only), to edit and upload again. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!(await amIAdmin(supabase))) return NextResponse.json({ error: "Only the app owner can do this." }, { status: 403 });

  const foods = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("foods")
      .select("*")
      .in("status", ["approved", "pending"])
      .order("name")
      .range(from, from + 999);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    foods.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse("﻿" + libraryCsv(foods), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="food-library-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
