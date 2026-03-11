import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminPage() {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR")) redirect("/");

  return (
    <Card>
      <CardHeader><CardTitle>Moderasyon Paneli</CardTitle></CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-3">
        <Link className="rounded-md border p-4" href="/admin/reports">Raporlar</Link>
        <Link className="rounded-md border p-4" href="/admin/users">Kullanicilar</Link>
        <Link className="rounded-md border p-4" href="/admin/listings">İlanlar</Link>
      </CardContent>
    </Card>
  );
}

