import { redirect } from "next/navigation";

export default function LegacySuperAdminAdminsRedirectPage() {
  redirect("/super-admin/users/admins");
}
