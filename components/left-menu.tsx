"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  BarChart3,
  CircleUserRound,
  Compass,
  House,
  Info,
  LayoutPanelTop,
  LogIn,
  MessagesSquare,
  Shield,
  ShoppingBasket,
  Store
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";

type LeftMenuProps = {
  isLoggedIn: boolean;
  role?: string;
  userId?: string;
  accountType?: "NEIGHBOR" | "BUSINESS";
  hasShop?: boolean;
};

export function LeftMenu({ isLoggedIn, role, userId, accountType, hasShop }: LeftMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const close = () => setOpen(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("menu-open");

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.classList.remove("menu-open");
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Menu"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-amber-200 bg-white text-2xl text-amber-700 shadow-sm transition hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
      >
        ☰
      </button>

      {mounted && open
        ? createPortal(
            <>
              <div
                aria-hidden="true"
                onClick={close}
                className="fixed inset-0 z-[1200] bg-[rgba(30,20,8,0.58)] transition-opacity duration-300"
              />
              <aside className="fixed left-0 top-0 z-[1300] h-screen w-[min(24rem,92vw)] border-r border-amber-200 bg-[linear-gradient(180deg,#fffaf1_0%,#fff5e7_42%,#fffdf9_100%)] shadow-[0_24px_80px_rgba(66,38,12,0.28)] animate-in slide-in-from-left-8 duration-300">
                <div className="flex items-center justify-between border-b border-amber-200/80 bg-white/88 p-4 backdrop-blur">
                  <BrandLogo markOnly />
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close menu"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200 bg-white text-lg text-zinc-700 shadow-sm"
                  >
                    ×
                  </button>
                </div>

                <nav className="flex max-h-[calc(100vh-82px)] flex-col gap-2.5 overflow-y-auto p-4 [&>button]:h-12 [&>button]:w-full [&>button]:justify-start [&>button]:rounded-2xl [&>button]:border-amber-200 [&>button]:bg-white/96 [&>button]:text-base [&>button]:shadow-sm">
                  {!isLoggedIn && (
                    <Button asChild variant="outline" onClick={close} className="justify-start">
                      <Link href="/auth/login" className="inline-flex w-full items-center gap-3 text-base">
                        <LogIn className="h-5 w-5 text-orange-500" /> Giriş
                      </Link>
                    </Button>
                  )}

                  <Button asChild variant="outline" onClick={close} className="justify-start">
                    <Link href="/hakkimizda" className="inline-flex w-full items-center gap-3 text-base">
                      <Info className="h-5 w-5 text-orange-500" /> Hakkımızda
                    </Link>
                  </Button>

                  {isLoggedIn && (
                    <>
                      <Button asChild variant="outline" onClick={close} className="justify-start">
                        <Link href="/home" className="inline-flex w-full items-center gap-3 text-base">
                          <House className="h-5 w-5 text-orange-500" /> Ana Sayfa
                        </Link>
                      </Button>

                      <Button asChild variant="outline" onClick={close} className="justify-start">
                        <Link href="/board" className="inline-flex w-full items-center gap-3 text-base">
                          <LayoutPanelTop className="h-5 w-5 text-orange-500" /> Pano
                        </Link>
                      </Button>

                      <Button asChild variant="outline" onClick={close} className="justify-start">
                        <Link href="/polls" className="inline-flex w-full items-center gap-3 text-base">
                          <BarChart3 className="h-5 w-5 text-orange-500" /> Oylama
                        </Link>
                      </Button>

                      <Button asChild variant="outline" onClick={close} className="justify-start">
                        <Link href="/map" className="inline-flex w-full items-center gap-3 text-base">
                          <Compass className="h-5 w-5 text-orange-500" /> Harita
                        </Link>
                      </Button>

                      <Button asChild variant="outline" onClick={close} className="justify-start">
                        <Link href="/carsi" className="inline-flex w-full items-center gap-3 text-base">
                          <Store className="h-5 w-5 text-orange-500" /> Çarşı
                        </Link>
                      </Button>

                      <Button asChild variant="outline" onClick={close} className="justify-start">
                        <Link href="/pazar" className="inline-flex w-full items-center gap-3 text-base">
                          <ShoppingBasket className="h-5 w-5 text-orange-500" /> Pazar
                        </Link>
                      </Button>

                      <Button asChild variant="outline" onClick={close} className="justify-start">
                        <Link href="/messages" className="inline-flex w-full items-center gap-3 text-base">
                          <MessagesSquare className="h-5 w-5 text-orange-500" /> Mesajlar
                        </Link>
                      </Button>

                      {userId && (
                        <Button asChild variant="outline" onClick={close} className="justify-start">
                          <Link href={`/profile/${userId}`} className="inline-flex w-full items-center gap-3 text-base">
                            <CircleUserRound className="h-5 w-5 text-orange-500" /> Profil
                          </Link>
                        </Button>
                      )}

                      {accountType === "BUSINESS" && hasShop ? (
                        <Button asChild variant="outline" onClick={close} className="justify-start">
                          <Link href="/my-shop" className="inline-flex w-full items-center gap-3 text-base">
                            <Store className="h-5 w-5 text-orange-500" /> Dükkanım
                          </Link>
                        </Button>
                      ) : null}

                      {(role === "ADMIN" || role === "MODERATOR") && (
                        <Button asChild variant="outline" onClick={close} className="justify-start">
                          <Link href="/admin" className="inline-flex w-full items-center gap-3 text-base">
                            <Shield className="h-5 w-5 text-orange-500" /> Admin
                          </Link>
                        </Button>
                      )}
                    </>
                  )}
                </nav>
              </aside>
            </>,
            document.body
          )
        : null}
    </>
  );
}



