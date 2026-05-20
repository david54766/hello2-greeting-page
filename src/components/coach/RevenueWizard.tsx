import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { upsertRevenueProfile } from "@/lib/revenue-profile.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft, ArrowRight, Check, AlertCircle, RefreshCw, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { z } from "zod";

// Per-step validation: non-negative finite numbers, reasonable ranges, required fields.
const num = (max: number, label: string) =>
  z
    .union([z.number(), z.null(), z.undefined()])
    .refine((v) => v == null || (Number.isFinite(v) && (v as number) >= 0), {
      message: `${label} must be 0 or greater`,
    })
    .refine((v) => v == null || (v as number) <= max, {
      message: `${label} must be ≤ ${max.toLocaleString()}`,
    });

const scopeSchema = z
  .object({
    scopeMode: z.enum(["portfolio", "center"]),
    activeCenterId: z.string().nullable(),
  })
  .refine((d) => d.scopeMode !== "center" || !!d.activeCenterId, {
    path: ["activeCenterId"],
    message: "Pick a center to deep-dive",
  });

const snapshotSchema = z
  .object({
    capacity: num(100000, "Capacity"),
    enrollment: num(100000, "Enrollment"),
    waitlist: num(100000, "Waitlist"),
    avg_weekly_tuition: num(5000, "Avg weekly tuition"),
    tuition_range: z.string().max(120).optional().nullable(),
    collection_rate: num(100, "Collection rate"),
    past_due_ar: num(10_000_000, "Past-due AR"),
  })
  .refine((d) => d.capacity != null && (d.capacity as number) > 0, {
    path: ["capacity"],
    message: "Capacity is required",
  })
  .refine((d) => d.enrollment != null, {
    path: ["enrollment"],
    message: "Enrollment is required",
  })
  .refine(
    (d) =>
      d.capacity == null ||
      d.enrollment == null ||
      (d.enrollment as number) <= (d.capacity as number),
    { path: ["enrollment"], message: "Enrollment cannot exceed capacity" },
  );

const modelSchema = z.object({
  tuition_structure: z.string().min(1, "Pick a tuition structure"),
  sibling_discount: z.string().max(200).optional().nullable(),
  registration_fee: z.string().max(200).optional().nullable(),
  subsidy_pct: num(100, "Subsidy %"),
  ancillary: z.string().max(1000).optional().nullable(),
});

const goalsSchema = z.object({
  revenue_goal: z.string().trim().min(1, "Set a revenue goal").max(200),
  raise_tuition: z.enum(["yes", "maybe", "no"], { message: "Select an option" }),
  staffing_constraints: z.string().max(1000).optional().nullable(),
  target_margin: num(100, "Target margin"),
});

type FieldErrors = Record<string, string>;

function zodErrors(err: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

type Center = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  capacity: number | null;
  enrollment_size: number | null;
  tuition_range: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: any;
  userId?: string;
  onSaved: () => void;
};

const STEPS = ["Scope", "Snapshot", "Revenue Model", "Goals", "Review"] as const;

export function RevenueWizard({ open, onOpenChange, initial, userId, onSaved }: Props) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const save = useServerFn(upsertRevenueProfile);

  const centersQ = useQuery({
    queryKey: ["centers", userId],
    enabled: !!userId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("centers")
        .select("id, name, city, state, capacity, enrollment_size, tuition_range")
        .eq("user_id", userId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Center[];
    },
  });

  const centers = centersQ.data ?? [];

  // form state
  const [scopeMode, setScopeMode] = useState<"portfolio" | "center">(
    initial?.scope_mode ?? "portfolio",
  );
  const [activeCenterId, setActiveCenterId] = useState<string | null>(
    initial?.active_center_id ?? null,
  );
  const [snapshot, setSnapshot] = useState<any>(initial?.snapshot ?? {});
  const [model, setModel] = useState<any>(initial?.model ?? {});
  const [goals, setGoals] = useState<any>(initial?.goals ?? {});

  // Pre-fill snapshot when scope/center changes (only if fields are empty)
  useEffect(() => {
    if (!centers.length) return;
    if (scopeMode === "center" && activeCenterId) {
      const c = centers.find((x) => x.id === activeCenterId);
      if (c) {
        setSnapshot((prev: any) => ({
          capacity: prev.capacity ?? c.capacity ?? null,
          enrollment: prev.enrollment ?? c.enrollment_size ?? null,
          waitlist: prev.waitlist ?? null,
          avg_weekly_tuition: prev.avg_weekly_tuition ?? null,
          tuition_range: prev.tuition_range ?? c.tuition_range ?? "",
          collection_rate: prev.collection_rate ?? null,
          past_due_ar: prev.past_due_ar ?? null,
        }));
      }
    } else if (scopeMode === "portfolio") {
      const totalCap = centers.reduce((s, c) => s + (c.capacity ?? 0), 0);
      const totalEnr = centers.reduce((s, c) => s + (c.enrollment_size ?? 0), 0);
      setSnapshot((prev: any) => ({
        capacity: prev.capacity ?? (totalCap || null),
        enrollment: prev.enrollment ?? (totalEnr || null),
        waitlist: prev.waitlist ?? null,
        avg_weekly_tuition: prev.avg_weekly_tuition ?? null,
        tuition_range: prev.tuition_range ?? "",
        collection_rate: prev.collection_rate ?? null,
        past_due_ar: prev.past_due_ar ?? null,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeMode, activeCenterId, centers.length]);

  const [errors, setErrors] = useState<FieldErrors>({});

  const validateStep = (s: number): FieldErrors => {
    if (s === 0) {
      const r = scopeSchema.safeParse({ scopeMode, activeCenterId });
      return r.success ? {} : zodErrors(r.error);
    }
    if (s === 1) {
      const r = snapshotSchema.safeParse(snapshot);
      return r.success ? {} : zodErrors(r.error);
    }
    if (s === 2) {
      const r = modelSchema.safeParse(model);
      return r.success ? {} : zodErrors(r.error);
    }
    if (s === 3) {
      const r = goalsSchema.safeParse(goals);
      return r.success ? {} : zodErrors(r.error);
    }
    return {};
  };

  const goNext = () => {
    const e = validateStep(step);
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    setStep((s) => s + 1);
  };


  const handleSave = async (markSkipped = false) => {
    if (!markSkipped) {
      // Validate every step before final save.
      for (let s = 0; s <= 3; s++) {
        const e = validateStep(s);
        if (Object.keys(e).length) {
          setErrors(e);
          setStep(s);
          toast.error("Please complete the highlighted fields before saving");
          return;
        }
      }
      setErrors({});
    }
    setSaving(true);
    try {
      const res = await save({
        data: {
          scope_mode: scopeMode,
          active_center_id: scopeMode === "center" ? activeCenterId : null,
          snapshot: normalizeNumbers(snapshot),
          model,
          goals: normalizeNumbers(goals),
          skipped: markSkipped,
        },
      });
      if (!res.ok) {
        toast.error(res.error || "Could not save");
        return;
      }
      toast.success(markSkipped ? "Setup skipped — you can complete it anytime." : "Revenue profile saved.");
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const noCenters = !centersQ.isLoading && centers.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Revenue Mode Setup</DialogTitle>
          <DialogDescription>
            Step {step + 1} of {STEPS.length} — {STEPS[step]}. Raven uses this to ground every revenue answer in your real numbers.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex gap-1">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-border"}`}
            />
          ))}
        </div>

        {noCenters ? (
          <div className="py-8 text-center space-y-4">
            <p className="text-muted-foreground">
              Add at least one center before setting up Revenue mode. Center metrics (capacity, enrollment, tuition) anchor every recommendation.
            </p>
            <Button asChild>
              <Link to="/settings">Go to Settings → Centers</Link>
            </Button>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            {step === 0 && (
              <div className="space-y-4">
                <Label className="text-sm uppercase tracking-wider text-muted-foreground">Analysis scope</Label>
                <RadioGroup value={scopeMode} onValueChange={(v) => setScopeMode(v as any)}>
                  <label className="flex items-start gap-3 rounded-lg border border-border p-4 cursor-pointer hover:border-primary/40">
                    <RadioGroupItem value="portfolio" className="mt-1" />
                    <div>
                      <div className="font-medium">All centers as a portfolio</div>
                      <div className="text-sm text-muted-foreground">
                        Aggregate {centers.length} center{centers.length === 1 ? "" : "s"} into one strategy.
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 rounded-lg border border-border p-4 cursor-pointer hover:border-primary/40">
                    <RadioGroupItem value="center" className="mt-1" />
                    <div className="flex-1">
                      <div className="font-medium">A single center</div>
                      <div className="text-sm text-muted-foreground">Deep-dive one location.</div>
                    </div>
                  </label>
                </RadioGroup>

                {scopeMode === "center" && (
                  <div className="space-y-2">
                    <Label>Choose center</Label>
                    <Select value={activeCenterId ?? ""} onValueChange={(v) => setActiveCenterId(v)}>
                      <SelectTrigger className={errors.activeCenterId ? "border-destructive" : ""}><SelectValue placeholder="Select a center" /></SelectTrigger>
                      <SelectContent>
                        {centers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}{c.state ? ` — ${c.state}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError msg={errors.activeCenterId} />
                  </div>
                )}
              </div>
            )}

            {step === 1 && (
              <div className="grid grid-cols-2 gap-4">
                <NumberField label="Capacity (seats) *" max={100000} error={errors.capacity} value={snapshot.capacity} onChange={(v) => setSnapshot({ ...snapshot, capacity: v })} />
                <NumberField label="Current enrollment *" max={100000} error={errors.enrollment} value={snapshot.enrollment} onChange={(v) => setSnapshot({ ...snapshot, enrollment: v })} />
                <NumberField label="Waitlist size" max={100000} error={errors.waitlist} value={snapshot.waitlist} onChange={(v) => setSnapshot({ ...snapshot, waitlist: v })} />
                <NumberField label="Avg weekly tuition ($)" max={5000} error={errors.avg_weekly_tuition} value={snapshot.avg_weekly_tuition} onChange={(v) => setSnapshot({ ...snapshot, avg_weekly_tuition: v })} />
                <div className="col-span-2">
                  <Label>Tuition range (optional)</Label>
                  <Input maxLength={120} value={snapshot.tuition_range ?? ""} onChange={(e) => setSnapshot({ ...snapshot, tuition_range: e.target.value })} placeholder="$280–$420/week" />
                  <FieldError msg={errors.tuition_range} />
                </div>
                <NumberField label="Collection rate (%)" max={100} error={errors.collection_rate} value={snapshot.collection_rate} onChange={(v) => setSnapshot({ ...snapshot, collection_rate: v })} />
                <NumberField label="Past-due AR ($)" max={10_000_000} error={errors.past_due_ar} value={snapshot.past_due_ar} onChange={(v) => setSnapshot({ ...snapshot, past_due_ar: v })} />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label>Tuition structure *</Label>
                  <Select value={model.tuition_structure ?? ""} onValueChange={(v) => setModel({ ...model, tuition_structure: v })}>
                    <SelectTrigger className={errors.tuition_structure ? "border-destructive" : ""}><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="other">Other / mixed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError msg={errors.tuition_structure} />
                </div>
                <div>
                  <Label>Sibling discount policy</Label>
                  <Input maxLength={200} value={model.sibling_discount ?? ""} onChange={(e) => setModel({ ...model, sibling_discount: e.target.value })} placeholder="e.g. 10% off second child" />
                  <FieldError msg={errors.sibling_discount} />
                </div>
                <div>
                  <Label>Registration / enrollment fee</Label>
                  <Input maxLength={200} value={model.registration_fee ?? ""} onChange={(e) => setModel({ ...model, registration_fee: e.target.value })} placeholder="e.g. $150 non-refundable" />
                  <FieldError msg={errors.registration_fee} />
                </div>
                <NumberField label="Subsidy / voucher mix (% of revenue)" max={100} error={errors.subsidy_pct} value={model.subsidy_pct} onChange={(v) => setModel({ ...model, subsidy_pct: v })} />
                <div>
                  <Label>Ancillary revenue (camps, late fees, meals, etc.)</Label>
                  <Textarea rows={2} maxLength={1000} value={model.ancillary ?? ""} onChange={(e) => setModel({ ...model, ancillary: e.target.value })} placeholder="What else generates revenue?" />
                  <FieldError msg={errors.ancillary} />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <Label>6-month revenue goal *</Label>
                  <Input maxLength={200} value={goals.revenue_goal ?? ""} aria-invalid={!!errors.revenue_goal} className={errors.revenue_goal ? "border-destructive" : ""} onChange={(e) => setGoals({ ...goals, revenue_goal: e.target.value })} placeholder="e.g. +20% or $1.2M ARR" />
                  <FieldError msg={errors.revenue_goal} />
                </div>
                <div>
                  <Label>Open to raising tuition? *</Label>
                  <RadioGroup value={goals.raise_tuition ?? ""} onValueChange={(v) => setGoals({ ...goals, raise_tuition: v })} className="flex gap-4">
                    {["yes", "maybe", "no"].map((v) => (
                      <label key={v} className="flex items-center gap-2 cursor-pointer">
                        <RadioGroupItem value={v} />
                        <span className="capitalize">{v}</span>
                      </label>
                    ))}
                  </RadioGroup>
                  <FieldError msg={errors.raise_tuition} />
                </div>
                <div>
                  <Label>Hiring / staffing constraints</Label>
                  <Textarea rows={2} maxLength={1000} value={goals.staffing_constraints ?? ""} onChange={(e) => setGoals({ ...goals, staffing_constraints: e.target.value })} placeholder="e.g. Can't hire another lead teacher right now." />
                  <FieldError msg={errors.staffing_constraints} />
                </div>
                <NumberField label="Target operating margin (%)" max={100} error={errors.target_margin} value={goals.target_margin} onChange={(v) => setGoals({ ...goals, target_margin: v })} />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3 text-sm">
                <Row k="Scope" v={scopeMode === "portfolio" ? `Portfolio (${centers.length} centers)` : centers.find((c) => c.id === activeCenterId)?.name ?? "—"} />
                <Row k="Capacity / Enrollment" v={`${snapshot.enrollment ?? "—"} / ${snapshot.capacity ?? "—"}`} />
                <Row k="Avg weekly tuition" v={snapshot.avg_weekly_tuition ? `$${snapshot.avg_weekly_tuition}` : (snapshot.tuition_range || "—")} />
                <Row k="Collection rate" v={snapshot.collection_rate ? `${snapshot.collection_rate}%` : "—"} />
                <Row k="Tuition structure" v={model.tuition_structure ?? "—"} />
                <Row k="Subsidy mix" v={model.subsidy_pct ? `${model.subsidy_pct}%` : "—"} />
                <Row k="Revenue goal" v={goals.revenue_goal ?? "—"} />
                <Row k="Raise tuition" v={goals.raise_tuition ?? "—"} />
                <Row k="Target margin" v={goals.target_margin ? `${goals.target_margin}%` : "—"} />
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex sm:justify-between gap-2">
          <Button variant="ghost" onClick={() => handleSave(true)} disabled={saving || noCenters}>
            Skip for now
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={saving}>
                <ArrowLeft className="size-4 mr-1" /> Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button onClick={goNext} disabled={noCenters || saving}>
                Next <ArrowRight className="size-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={() => handleSave(false)} disabled={saving || noCenters}>
                {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : <Check className="size-4 mr-2" />}
                Save profile
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NumberField({
  label,
  value,
  onChange,
  error,
  max,
}: {
  label: string;
  value: any;
  onChange: (v: number | null) => void;
  error?: string;
  max?: number;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type="number"
        min={0}
        max={max}
        step="any"
        value={value ?? ""}
        aria-invalid={!!error}
        className={error ? "border-destructive focus-visible:ring-destructive" : ""}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") return onChange(null);
          const n = Number(raw);
          onChange(Number.isFinite(n) ? n : null);
        }}
      />
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="size-3" /> {error}
        </p>
      )}
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
      <AlertCircle className="size-3" /> {msg}
    </p>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-border/40 py-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

function normalizeNumbers(obj: any) {
  const out: any = {};
  for (const [k, v] of Object.entries(obj ?? {})) {
    if (v === "" || v === undefined) continue;
    out[k] = v;
  }
  return out;
}
