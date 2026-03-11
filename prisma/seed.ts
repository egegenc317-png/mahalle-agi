import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const [bursa, istanbul, ankara] = await Promise.all([
    prisma.neighborhood.upsert({
      where: { inviteCode: "NILUFER123" },
      update: {},
      create: { city: "Bursa", district: "Nilufer", name: "Gorukle", inviteCode: "NILUFER123" }
    }),
    prisma.neighborhood.upsert({
      where: { inviteCode: "KADIKOY123" },
      update: {},
      create: { city: "Istanbul", district: "Kadikoy", name: "Moda", inviteCode: "KADIKOY123" }
    }),
    prisma.neighborhood.upsert({
      where: { inviteCode: "CANKAYA123" },
      update: {},
      create: { city: "Ankara", district: "Cankaya", name: "Bahcelievler", inviteCode: "CANKAYA123" }
    })
  ]);

  const passwordHash = await hash("123456", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@mahalle.local" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@mahalle.local",
      passwordHash,
      role: "ADMIN",
      neighborhoodId: bursa.id,
      verifiedAt: new Date(),
      birthDate: new Date("1990-01-01")
    }
  });

  const demo = await prisma.user.upsert({
    where: { email: "demo@mahalle.local" },
    update: {},
    create: {
      name: "Demo Kullanici",
      email: "demo@mahalle.local",
      passwordHash,
      neighborhoodId: istanbul.id,
      verifiedAt: new Date(),
      birthDate: new Date("1998-01-01")
    }
  });

  const samples = [
    {
      neighborhoodId: bursa.id,
      userId: admin.id,
      type: "PRODUCT",
      title: "Az kullanilmis bisiklet",
      description: "26 jant, bakimli ve temiz.",
      price: 4500,
      category: "Spor",
      photos: "[]",
      status: "ACTIVE"
    },
    {
      neighborhoodId: istanbul.id,
      userId: demo.id,
      type: "SERVICE",
      title: "Matematik ozel ders",
      description: "Lise seviyesi birebir ders verilir.",
      price: 500,
      category: "Egitim",
      photos: "[]",
      status: "ACTIVE"
    },
    {
      neighborhoodId: ankara.id,
      userId: demo.id,
      type: "JOB",
      title: "Gunluk paket tasima yardimi",
      description: "Yarim gun tasima yardimcisi araniyor.",
      price: 800,
      category: "Lojistik",
      photos: "[]",
      status: "ACTIVE"
    },
    {
      neighborhoodId: bursa.id,
      userId: admin.id,
      type: "PRODUCT",
      title: "Koltuk takimi",
      description: "Temiz durumda, acil satilik.",
      price: 10000,
      category: "Ev",
      photos: "[]",
      status: "SOLD"
    },
    {
      neighborhoodId: istanbul.id,
      userId: demo.id,
      type: "JOB",
      title: "Hafta sonu cafe personeli",
      description: "Part-time deneyimli personel ariyoruz.",
      price: null,
      category: "Hizmet",
      photos: "[]",
      status: "ACTIVE"
    }
  ];

  for (const listing of samples) {
    await prisma.listing.create({ data: listing });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
