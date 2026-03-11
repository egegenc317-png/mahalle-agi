// @ts-nocheck
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AdminReport = Awaited<ReturnType<typeof prisma.report.findMany>>[number];

export default async function AdminReportsPage() {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR")) redirect("/");

  const reports = await prisma.report.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <Card>
      <CardHeader><CardTitle>Raporlar</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {reports.length === 0 && <p className="text-sm text-muted-foreground">Rapor yok.</p>}
        {reports.map((r: AdminReport) => (
          <div key={r.id} className="rounded-md border p-3 text-sm">
            <p>{r.targetType} / {r.reason} / {r.status}</p>
            <form action={`/api/admin/reports/${r.id}/resolve`} method="post" className="mt-2 flex gap-2">
              <input type="hidden" name="status" value="RESOLVED" />
              <Button type="submit" size="sm" variant="outline">Resolve</Button>
            </form>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

