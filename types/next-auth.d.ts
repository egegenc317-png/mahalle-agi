import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      neighborhoodId?: string | null;
      locationScope?: "NEIGHBORHOOD" | "DISTRICT" | null;
      accountType?: "NEIGHBOR" | "BUSINESS";
    };
  }

  interface User {
    role?: string;
    neighborhoodId?: string | null;
    locationScope?: "NEIGHBORHOOD" | "DISTRICT" | null;
    accountType?: "NEIGHBOR" | "BUSINESS";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    neighborhoodId?: string | null;
    locationScope?: "NEIGHBORHOOD" | "DISTRICT" | null;
    accountType?: "NEIGHBOR" | "BUSINESS";
  }
}
