import { redirect } from "next/navigation";

/**
 * Root page — redirects to /feed (the main feed is public).
 */
export default function Home() {
  redirect("/feed");
}
