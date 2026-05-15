import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data, error } = await supabase
      .from("rooms")
      .insert({ code })
      .select()
      .single();

    if (error) throw error;

    await supabase.from("members").insert({ room_id: data.id, name });

    return NextResponse.json({ code, roomId: data.id });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");
    const name = req.nextUrl.searchParams.get("name");

    const { data: room, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("code", code)
      .single();

    if (error || !room) {
      return NextResponse.json({ error: "ルームが見つかりません" }, { status: 404 });
    }

    const { data: existing } = await supabase
      .from("members")
      .select("*")
      .eq("room_id", room.id)
      .eq("name", name);

    if (!existing || existing.length === 0) {
      await supabase.from("members").insert({ room_id: room.id, name });
    }

    return NextResponse.json({ roomId: room.id, code: room.code, settings: room.settings || {} });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
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
