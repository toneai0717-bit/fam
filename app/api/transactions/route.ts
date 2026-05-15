import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const roomId = req.nextUrl.searchParams.get("roomId");

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: String(error) }, { status: 500 });
  return NextResponse.json({ transactions: data });
}

export async function POST(req: NextRequest) {
  try {
    const { roomId, memberName, type, taskName, points, message, targetName } = await req.json();

    const { data, error } = await supabase
      .from("transactions")
      .insert({ room_id: roomId, member_name: memberName, type, task_name: taskName, points, message: message || null, target_name: targetName || null })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ transaction: data });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
