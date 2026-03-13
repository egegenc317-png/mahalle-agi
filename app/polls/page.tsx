// @ts-nocheck
import { Crown, Vote } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { canUserCreatePollByMukhtarRule, getWeeklyNeighborhoodMukhtar } from "@/lib/mukhtar";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type PollVoteView = {
  userId: string;
  optionIndex: number;
};

type PollView = {
  id: string;
  question: string;
  options: string[];
  user: { id: string; name: string };
  votes: PollVoteView[];
};

export default async function PollsPage({ searchParams }: { searchParams?: { error?: string } }) {
  const session = await auth();
  if (!session) redirect("/auth/login");
  if (!session.user.locationScope) redirect("/onboarding/scope");
  if (!session.user.neighborhoodId) redirect("/onboarding/neighborhood");

  const [polls, mukhtar, permission] = await Promise.all([
    prisma.poll.findMany({
      where: { neighborhoodId: session.user.neighborhoodId },
      include: { user: { select: { id: true, name: true } }, votes: true },
      orderBy: { createdAt: "desc" }
    }) as Promise<PollView[]>,
    getWeeklyNeighborhoodMukhtar(session.user.neighborhoodId),
    canUserCreatePollByMukhtarRule({
      userId: session.user.id,
      role: session.user.role,
      neighborhoodId: session.user.neighborhoodId
    })
  ]);

  const areaLabel = "Mahalle";
  const areaLabelLower = "mahalle";
  const canCreate = permission.ok;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[24px] border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4 shadow-sm sm:rounded-2xl sm:p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-orange-300/30 blur-2xl" />
        <div className="pointer-events-none absolute -left-8 bottom-0 h-28 w-28 rounded-full bg-amber-300/20 blur-2xl" />

        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">{areaLabel} Oylamalari</h1>
            <p className="text-sm text-zinc-600">Mahallende kararlar oyla alınır. Oy vermek herkese Açık.</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-white/80 px-3 py-2 text-xs text-zinc-700">
            <p className="mb-1 inline-flex items-center gap-1 font-semibold text-zinc-800"><Crown className="h-3.5 w-3.5 text-amber-600" /> Bu Haftanın Muhtarı</p>
            <p>{mukhtar ? `${mukhtar.name} (@${mukhtar.username || "Kullanıcı"})` : "Henüz belirlenmedi"}</p>
          </div>
        </div>
      </section>

      <Card className="border-amber-200 bg-white/95 shadow-sm">
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2 text-zinc-900"><Vote className="h-4 w-4 text-orange-500" /> {areaLabel} Oylaması Oluştur</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-2 text-xs text-zinc-600">
            Sadece admin veya bu haftanın mahalle muhtarı anket açabilir. Seçenekler anket oluştururken girilir.
          </p>
          {searchParams?.error ? <p className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{searchParams.error}</p> : null}

          {canCreate ? (
            <form action="/api/polls" method="post" className="space-y-2">
              <Input name="question" placeholder="Soru" required className="border-zinc-300" />
              <Input name="option1" placeholder="Seçenek 1" required className="border-zinc-300" />
              <Input name="option2" placeholder="Seçenek 2" required className="border-zinc-300" />
              <Input name="option3" placeholder="Seçenek 3 (opsiyonel)" className="border-zinc-300" />
              <Input name="option4" placeholder="Seçenek 4 (opsiyonel)" className="border-zinc-300" />
              <Input name="option5" placeholder="Seçenek 5 (opsiyonel)" className="border-zinc-300" />
              <Button type="submit" className="w-full bg-orange-500 text-white hover:bg-orange-600 sm:w-auto">Anket Oluştur</Button>
            </form>
          ) : (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Anket açma yetkin yok.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-zinc-200 bg-white/95 shadow-sm">
        <CardHeader>
          <CardTitle>Aktif Oylamalar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {polls.length === 0 && <p className="text-sm text-muted-foreground">Bu {areaLabelLower}te Henüz anket yok.</p>}
          {polls.map((poll) => {
            const totalVotes = poll.votes.length;
            const myVote = poll.votes.find((v) => v.userId === session.user.id);
            return (
              <div key={poll.id} className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
                <p className="font-semibold text-zinc-900">{poll.question}</p>
                <p className="mb-1 text-xs text-zinc-500">Oluşturan: {poll.user.name}</p>
                {myVote ? (
                  <p className="mb-3 text-xs text-emerald-700">Oy verdin. Baska bir seçenege basarak oyunu degistirebilirsin.</p>
                ) : (
                  <p className="mb-3 text-xs text-zinc-500">Oy vermek için bir seçenege tikla.</p>
                )}

                <div className="space-y-2">
                  {poll.options.map((option, index) => {
                    const voteCount = poll.votes.filter((v) => v.optionIndex === index).length;
                    const percent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                    const selected = myVote?.optionIndex === index;
                    return (
                      <div key={`${poll.id}-${index}`} className="rounded-lg border border-zinc-200 bg-white p-2">
                        <form action={`/api/polls/${poll.id}/vote`} method="post" className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                          <input type="hidden" name="optionIndex" value={index} />
                          <Button type="submit" variant={selected ? "default" : "outline"} size="sm" className={selected ? "bg-zinc-900 text-white" : ""}>
                            {option}
                          </Button>
                          <span className="text-xs text-zinc-600">{voteCount} oy ({percent}%)</span>
                        </form>
                        <div className="mt-2 h-2 rounded-full bg-zinc-100">
                          <div className="h-2 rounded-full bg-orange-400" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}






