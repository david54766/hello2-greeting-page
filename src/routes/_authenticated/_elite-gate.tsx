import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { checkEliteAccess } from "@/lib/elite-access.functions";

export const Route = createFileRoute("/_authenticated/_elite-gate")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;

    const res = await checkEliteAccess();
    if (!res.allowed) {
      throw redirect({ to: "/elite" });
    }
  },
  component: () => <Outlet />,
});
