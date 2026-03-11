import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type ListingUser = {
  id: string;
  name: string;
  username?: string | null;
  image?: string | null;
};

type ListingRecord = {
  id: string;
  type: string;
  title: string;
  description: string;
  price: number | null;
  category: string;
  user: ListingUser;
};

type ListingCardProps = {
  listing: ListingRecord;
  variant?: "default" | "warm";
};

export function ListingCard({ listing, variant = "default" }: ListingCardProps) {
  const warm = variant === "warm";

  return (
    <article className="relative">
      <Link href={`/listings/${listing.id}`} className="absolute inset-0 z-10" aria-label={`${listing.title} detayına git`} />
      <Card className={`overflow-hidden transition ${warm ? "border-amber-200 bg-gradient-to-b from-[#fffdf8] to-[#fff3df] shadow-sm hover:-translate-y-0.5 hover:shadow-md" : "hover:shadow-md"}`}>
        <CardHeader className="relative z-20 pointer-events-none">
          <div className="flex items-center justify-between gap-2">
            <Badge className={warm ? "bg-emerald-600 text-white" : ""}>{listing.type}</Badge>
            <Badge variant="outline" className={warm ? "border-amber-300 bg-white/80 text-amber-800" : ""}>{listing.category}</Badge>
          </div>
          <CardTitle className={`text-base ${warm ? "text-zinc-900" : ""}`}>{listing.title}</CardTitle>
        </CardHeader>
        <CardContent className="relative z-20 pointer-events-none">
          <p className={`line-clamp-2 text-sm ${warm ? "text-zinc-700" : "text-muted-foreground"}`}>{listing.description}</p>
        </CardContent>
        <CardFooter className="relative z-20 flex items-center justify-between">
          <span className={`text-sm font-medium ${warm ? "text-zinc-900" : ""}`}>{listing.price ? `${listing.price} TL` : "Fiyat belirtilmedi"}</span>
          <Link
            href={`/profile/${listing.user.id}`}
            className={`pointer-events-auto inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs ${
              warm
                ? "border-amber-300 bg-white/85 text-zinc-700 hover:bg-white"
                : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {listing.user.image ? (
              <Image src={listing.user.image} alt={listing.user.name} width={20} height={20} className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-200 text-[10px] font-semibold text-amber-800">
                {listing.user.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="max-w-[110px] truncate">@{listing.user.username || listing.user.name}</span>
          </Link>
        </CardFooter>
      </Card>
    </article>
  );
}



