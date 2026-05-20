import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setRevenueScope, resetRevenueProfile } from "@/lib/revenue-profile.functions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type Props = {
  profile: any;
  userId?: string;
  onEdit: () => void;
  onChanged: () => void;
};

export function RevenueScopeBar({ profile, userId, onEdit, onChanged }: Props) {
  const setScope = useServerFn(setRevenueScope);
  const reset = useServerFn(resetRevenueProfile);
  const [confirmReset, setConfirmReset] = useState(false);

  const centersQ = useQuery({
    queryKey: ["centers", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("centers")
        .select("id, name, state")
        .eq("user_id", userId!)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const centers = centersQ.data ?? [];
  const isSkipped = profile.skipped;
  const goal = profile?.goals?.revenue_goal;

  const currentValue =
    profile.scope_mode === "portfolio" ? "portfolio" : profile.active_center_id ?? "portfolio";

  const handleScope = async (value: string) => {
    const res = await setScope({
      data:
        value === "portfolio"
          ? { scope_mode: "portfolio", active_center_id: null }
          : { scope_mode: "center", active_center_id: value },
    });
    if (!res.ok) toast.error(res.error || "Could not update scope");
    else {
      toast.success("Scope updated.");
      onChanged();
    }
  };

  const handleReset = async () => {
    const res = await reset();
    if (!res.ok) toast.error(res.error || "Could not reset");
    else {
      toast.success("Revenue profile reset.");
      onChanged();
    }
    setConfirmReset(false);
  };

  return (
    <>
      <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
        {isSkipped && (
          <div className="mb-2 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="size-3" /> Setup skipped — complete it for sharper, numbers-grounded answers.
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs uppercase tracking-[0.2em] text-primary">Scope</span>
          <Select value={currentValue} onValueChange={handleScope}>
            <SelectTrigger className="h-8 w-auto min-w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="portfolio">All centers ({centers.length})</SelectItem>
              {centers.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}{c.state ? ` — ${c.state}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {goal && (
            <>
              <span className="text-border">·</span>
              <span className="text-sm text-muted-foreground">
                Goal: <span className="text-foreground">{goal}</span>
              </span>
            </>
          )}
          <div className="ml-auto flex gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Pencil className="size-3 mr-1" /> Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)}>
              <RotateCcw className="size-3 mr-1" /> Reset
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset revenue profile?</AlertDialogTitle>
            <AlertDialogDescription>
              Clears your saved snapshot, model, and goals. The wizard will run again next time you open Revenue mode.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
