import { NextResponse } from "next/server";

import { readStoredObject } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: { path?: string[] } }) {
  const key = (params.path || []).join("/");
  if (!key) {
    return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 404 });
  }

  try {
    const file = await readStoredObject(key);
    if (!file) {
      return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 404 });
    }

    return new NextResponse(file.body as BodyInit, {
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": file.cacheControl
      }
    });
  } catch {
    return NextResponse.json({ error: "Dosya açılamadı." }, { status: 500 });
  }
}
