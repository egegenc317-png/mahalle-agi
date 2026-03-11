import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export default async function PostLoginPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");
  redirect("/onboarding/scope");
}
