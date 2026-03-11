// @ts-nocheck
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AdminUser = Awaited<ReturnType<typeof prisma.user.findMany>>[number];

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR")) redirect("/");

  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <Card>
      <CardHeader><CardTitle>Kullanicilar</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {users.map((u: AdminUser) => (
          <div key={u.id} className="rounded-md border p-3 text-sm">
            <p>{u.name} ({u.email}) - {u.role}</p>
            <form action={`/api/admin/users/${u.id}/suspend`} method="post" className="mt-2 flex items-center gap-2">
              <input name="days" defaultValue={7} min={1} type="number" className="h-9 w-20 rounded border px-2" />
              <Button type="submit" size="sm" variant="outline">Suspend</Button>
            </form>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

