import { redirect } from "next/navigation";

/** Legacy / bookmark path — staff console lives at /staff after login. */
export default function AdminRedirectPage() {
  redirect("/login");
}
