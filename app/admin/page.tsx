import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, Building2, FileText, MessageCircle, Megaphone, ShieldCheck, UserPlus, Users } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AdminUser = {
  id: string;
  name: string;
  username?: string | null;
  createdAt: Date | string;
  lastActiveAt?: Date | string | null;
  neighborhoodId?: string | null;
  accountType?: string | null;
  neighborhood?: {
    city: string;
    district: string;
    name: string;
  } | null;
};

type NeighborhoodSummary = {
  id: string;
  city: string;
  district: string;
  name: string;
};

type NeighborhoodListing = {
  neighborhoodId: string;
};

type NeighborhoodPost = {
  neighborhoodId: string;
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000);
}

const statCards = [
  {
    key: "totalUsers",
    title: "Toplam Hesap",
    icon: Users,
    accent: "from-[#f59e0b] to-[#ea580c]"
  },
  {
    key: "todayUsers",
    title: "Bugün Açılan Hesap",
    icon: UserPlus,
    accent: "from-[#f97316] to-[#fb923c]"
  },
  {
    key: "onlineUsers",
    title: "Şu An Online",
    icon: Activity,
    accent: "from-[#16a34a] to-[#22c55e]"
  },
  {
    key: "totalListings",
    title: "Toplam İlan",
    icon: FileText,
    accent: "from-[#2563eb] to-[#38bdf8]"
  },
  {
    key: "totalBoardPosts",
    title: "Toplam Duyuru",
    icon: Megaphone,
    accent: "from-[#d97706] to-[#f59e0b]"
  },
  {
    key: "businessUsers",
    title: "Toplam İşletme",
    icon: Building2,
    accent: "from-[#7c3aed] to-[#a855f7]"
  },
  {
    key: "totalMessages",
    title: "Toplam Mesaj",
    icon: MessageCircle,
    accent: "from-[#0f766e] to-[#14b8a6]"
  },
  {
    key: "openReports",
    title: "Açık Rapor",
    icon: ShieldCheck,
    accent: "from-[#dc2626] to-[#f97316]"
  }
] as const;

export default async function AdminPage() {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR")) redirect("/");

  const [usersRaw, listingsRaw, boardPostsRaw, messages, reports, neighborhoodsRaw] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { neighborhood: true }
    }),
    db.listing.findMany({}),
    db.boardPost.findMany({}),
    db.message.findMany({}),
    db.report.findMany({ where: { status: "OPEN" }, orderBy: { createdAt: "desc" } }),
    db.neighborhood.findMany({})
  ]);

  const users = usersRaw as AdminUser[];
  const listings = listingsRaw as NeighborhoodListing[];
  const boardPosts = boardPostsRaw as NeighborhoodPost[];
  const neighborhoods = neighborhoodsRaw as NeighborhoodSummary[];

  const today = startOfToday();
  const onlineThreshold = minutesAgo(5);

  const stats = {
    totalUsers: users.length,
    todayUsers: users.filter((user) => new Date(user.createdAt) >= today).length,
    onlineUsers: users.filter((user) => user.lastActiveAt && new Date(user.lastActiveAt) >= onlineThreshold).length,
    totalListings: listings.length,
    totalBoardPosts: boardPosts.length,
    businessUsers: users.filter((user) => user.accountType === "BUSINESS").length,
    totalMessages: messages.length,
    openReports: reports.length
  };

  const recentUsers = users.slice(0, 6);
  const mostActiveNeighborhoods = neighborhoods
    .map((neighborhood) => {
      const neighborhoodUsers = users.filter((user) => user.neighborhoodId === neighborhood.id);
      const neighborhoodListings = listings.filter((listing) => listing.neighborhoodId === neighborhood.id);
      const neighborhoodPosts = boardPosts.filter((post) => post.neighborhoodId === neighborhood.id);

      return {
        id: neighborhood.id,
        label: `${neighborhood.city} / ${neighborhood.district} / ${neighborhood.name}`,
        users: neighborhoodUsers.length,
        listings: neighborhoodListings.length,
        posts: neighborhoodPosts.length
      };
    })
    .sort((a, b) => b.users + b.listings + b.posts - (a.users + a.listings + a.posts))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[30px] border border-amber-200 bg-[linear-gradient(135deg,#fff7e6_0%,#fffdf8_45%,#ffe9d4_100%)]">
        <div className="grid gap-5 p-6 lg:grid-cols-[1.4fr_0.8fr] lg:p-8">
          <div className="space-y-3">
            <span className="inline-flex w-fit rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white">Yönetim Merkezi</span>
            <h1 className="text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">Dijital Mahallem İstatistikleri</h1>
            <p className="max-w-2xl text-sm leading-7 text-zinc-700 sm:text-base">
              Buradan anlık kullanıcı hareketini, açılan hesapları ve içerik yoğunluğunu tek ekranda takip edebilirsin.
              Online sayısı son 5 dakika içinde aktiflik gönderen kullanıcıları baz alır.
            </p>
          </div>
          <div className="grid gap-3 rounded-[26px] border border-amber-200 bg-white/80 p-4 shadow-sm">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Canlı Durum</p>
              <p className="mt-1 text-2xl font-black text-emerald-900">{stats.onlineUsers}</p>
              <p className="text-xs text-emerald-700">son 5 dakikada aktif kullanıcı</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Bugün</p>
              <p className="mt-1 text-2xl font-black text-amber-900">{stats.todayUsers}</p>
              <p className="text-xs text-amber-700">yeni hesap açıldı</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const value = stats[card.key];
          return (
            <Card key={card.key} className="overflow-hidden border-amber-200 bg-white">
              <CardContent className="p-0">
                <div className={`h-1.5 bg-gradient-to-r ${card.accent}`} />
                <div className="flex items-start justify-between p-5">
                  <div>
                    <p className="text-sm font-medium text-zinc-500">{card.title}</p>
                    <p className="mt-2 text-3xl font-black text-zinc-950">{value}</p>
                  </div>
                  <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${card.accent} text-white shadow-sm`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-amber-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Son Açılan Hesaplar</CardTitle>
              <p className="mt-1 text-sm text-zinc-500">En son kayıt olan kullanıcılar ve aktiflik durumu</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-zinc-900">{user.name}</p>
                  <p className="truncate text-sm text-zinc-500">@{user.username || "kullanıcı adı yok"}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {user.neighborhood ? `${user.neighborhood.city} / ${user.neighborhood.district} / ${user.neighborhood.name}` : "Mahalle seçilmedi"}
                  </p>
                </div>
                <div className="text-right text-xs text-zinc-500">
                  <p>Kayıt: {formatDate(user.createdAt)}</p>
                  <p className={user.lastActiveAt && new Date(user.lastActiveAt) >= onlineThreshold ? "font-semibold text-emerald-600" : ""}>
                    Son aktif: {formatDate(user.lastActiveAt)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle>Mahalle Yoğunluğu</CardTitle>
              <p className="mt-1 text-sm text-zinc-500">Kullanıcı, ilan ve duyuru toplamına göre en hareketli mahalleler</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {mostActiveNeighborhoods.map((item) => (
                <div key={item.id} className="rounded-2xl border border-amber-100 bg-white px-4 py-3">
                  <p className="font-semibold text-zinc-900">{item.label}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-600">
                    <span className="rounded-full bg-amber-50 px-2.5 py-1">{item.users} kullanıcı</span>
                    <span className="rounded-full bg-orange-50 px-2.5 py-1">{item.listings} ilan</span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1">{item.posts} duyuru</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle>Hızlı Yönetim</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <Link className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 font-semibold text-zinc-900 transition hover:bg-amber-100" href="/admin/reports">Raporları Yönet</Link>
              <Link className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 font-semibold text-zinc-900 transition hover:bg-amber-100" href="/admin/users">Kullanıcıları Yönet</Link>
              <Link className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 font-semibold text-zinc-900 transition hover:bg-amber-100" href="/admin/listings">İlanları Yönet</Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
