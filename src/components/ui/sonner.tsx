import { Toaster as Sonner } from "sonner";

// ponytail: theme hardcoded "dark" (app is always dark) — no next-themes dep.
export function Toaster(props: React.ComponentProps<typeof Sonner>) {
  return <Sonner theme="dark" className="toaster group" position="bottom-center" {...props} />;
}

export { toast } from "sonner";
