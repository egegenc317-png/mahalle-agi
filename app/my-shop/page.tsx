// @ts-nocheck
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShopForm } from "@/app/my-shop/shop-form";

export default async function MyShopPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/auth/login");
  if (user.accountType !== "BUSINESS") redirect("/home");

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden rounded-[24px] sm:rounded-[28px]">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle>Dükkan Ayarlari</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <ShopForm
            initialShopName={user.shopName}
            initialLocationText={user.shopLocationText}
            initialLat={user.shopLocationLat}
            initialLng={user.shopLocationLng}
            initialBusinessCategory={user.businessCategory}
            initialShopLogo={user.shopLogo}
            initialBusinessClosedHours={user.businessClosedHours}
          />
        </CardContent>
      </Card>
    </div>
  );
}


