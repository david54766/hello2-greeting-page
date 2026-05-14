import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/hello2")({
  component: Hello2,
});

function Hello2() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <h1 className="text-6xl font-bold text-foreground">hello2</h1>
    </div>
  );
}
