import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const cookieStore = await cookies();
  redirect(cookieStore.has("access_token") ? "/dashboard" : "/login");
}
