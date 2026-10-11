import { redirect } from "next/navigation";

// Keeps the first-shared link (/charla) working now that each talk has its own page.
export default function CharlaRedirect() {
  redirect("/eventos/yesenia-valencia");
}
