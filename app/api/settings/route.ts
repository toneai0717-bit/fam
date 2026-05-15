import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const roomId = req.nextUrl.searchParams.get("roomId");
    const { data, error } = await supabase.from("rooms").select("settings").eq("id", roomId).single();
    if (error) throw error;
    return NextResponse.json({ settings: data.settings || {} });
  } catch (e) {
    return NextResponse.json({ settings: {} });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { roomId, settings } = await req.json();
    const { error } = await supabase.from("rooms").update({ settings }).eq("id", roomId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
