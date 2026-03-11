import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Aktif oylamaya seçenek ekleme kaldırıldı. Seçenekleri anket oluştururken girin." },
    { status: 410 }
  );
}


