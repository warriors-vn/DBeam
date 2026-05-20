import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tabletop — MySQL workspace" },
      {
        name: "description",
        content:
          "A fast, beautiful, keyboard-first MySQL workspace inspired by TablePlus and Linear.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <AppShell />;
}
