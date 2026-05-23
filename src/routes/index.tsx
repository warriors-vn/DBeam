import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DBeam — Native database IDE" },
      {
        name: "description",
        content:
          "A premium native database IDE inspired by TablePlus, Linear, Raycast, Arc, and VSCode.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <AppShell />;
}
