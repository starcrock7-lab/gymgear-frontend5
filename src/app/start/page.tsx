import { redirect } from "next/navigation";

/* The home-or-gym chooser is gone: the site is for home gyms, so old links
   to /start go straight to the quiz. */
export default function StartPage() {
  redirect("/quiz");
}
