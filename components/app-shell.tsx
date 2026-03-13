// @ts-nocheck
import Link from "next/link";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeftMenu } from "@/components/left-menu";
import { TopAuthButton } from "@/components/top-auth-button";
import { HeaderUserSearch } from "@/components/header-user-search";
import { SiteViewTracker } from "@/components/site-view-tracker";
import { UsageHeartbeat } from "@/components/usage-heartbeat";
import { BrandLogo } from "@/components/brand-logo";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();

  const dbUser = session?.user.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null;

  const hasShop = Boolean(
    dbUser &&
      dbUser.accountType === "BUSINESS" &&
      (dbUser.shopName || dbUser.shopLocationLat || dbUser.shopLocationLng)
  );
  const notificationHref = "/notifications";

  const homeHref = !session
    ? "/"
    : !session.user.locationScope
      ? "/onboarding/scope"
      : !session.user.neighborhoodId
        ? "/onboarding/neighborhood"
        : session.user.locationScope === "DISTRICT"
          ? "/map"
          : "/home";

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-emerald-50">
      <SiteViewTracker />
      <UsageHeartbeat enabled={Boolean(session)} />
      <header
        data-shell-layer="header"
        className="sticky top-0 z-50 border-b border-amber-100 bg-white/85 shadow-sm backdrop-blur-xl transition duration-300"
      >
        <div className="mx-auto max-w-6xl px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex flex-col gap-3 lg:hidden">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <LeftMenu
                  isLoggedIn={Boolean(session)}
                  role={session?.user.role}
                  userId={session?.user.id}
                  accountType={dbUser?.accountType}
                hasShop={hasShop}
              />
                <Link href={homeHref} prefetch className="inline-flex min-w-0 items-center">
                  <BrandLogo />
                </Link>
              </div>
              <div className="shrink-0">
                <TopAuthButton
                  isLoggedIn={Boolean(session)}
                  userId={session?.user.id}
                  userImage={dbUser?.image || null}
                  unreadCount={0}
                  notificationHref={notificationHref}
                  compact
                />
              </div>
            </div>
            <HeaderUserSearch isLoggedIn={Boolean(session)} compact />
          </div>

          <div className="hidden items-center gap-4 lg:flex">
            <div className="flex shrink-0 items-center gap-4">
              <LeftMenu
                isLoggedIn={Boolean(session)}
                role={session?.user.role}
                userId={session?.user.id}
                accountType={dbUser?.accountType}
                hasShop={hasShop}
              />
              <Link href={homeHref} prefetch className="inline-flex items-center">
                <BrandLogo size="lg" />
              </Link>
            </div>

            <div className="flex-1">
              <HeaderUserSearch isLoggedIn={Boolean(session)} />
            </div>

            <div className="shrink-0">
              <TopAuthButton
                isLoggedIn={Boolean(session)}
                userId={session?.user.id}
                userImage={dbUser?.image || null}
                unreadCount={0}
                notificationHref={notificationHref}
              />
            </div>
          </div>
        </div>
      </header>
      <main
        data-shell-layer="main"
        className="mx-auto max-w-6xl px-3 py-4 transition duration-300 sm:px-4 sm:py-5 lg:px-4 lg:py-6"
      >
        {children}
      </main>
    </div>
  );
}



