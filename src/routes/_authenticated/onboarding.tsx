import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import {
  checkHandleAvailability,
  completeOnboarding,
  signAvatarUrl,
} from "@/lib/profile.functions";
import { toast } from "sonner";
import { z } from "zod";
import { CircleNotch, Check, X, Camera, ImageSquare } from "@phosphor-icons/react";
import { FlowBody, FlowField, FlowHeading, FlowShell } from "@/components/site/flow-kit";
import { btnPrimary } from "@/components/site/ui";
import { postAuthTarget } from "@/lib/intent";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

const handleRegex = /^[a-zA-Z0-9_]{3,20}$/;

function Onboarding() {
  const navigate = useNavigate();
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [handle, setHandle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [handleStatus, setHandleStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "reserved" | "invalid"
  >("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const checkFn = useServerFn(checkHandleAvailability);
  const completeFn = useServerFn(completeOnboarding);
  const signFn = useServerFn(signAvatarUrl);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      setUid(data.user.id);
      setEmail(data.user.email ?? "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, handle, avatar_url")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profile?.handle) {
        navigate({ to: postAuthTarget(), replace: true });
        return;
      }
      const metaName =
        (data.user.user_metadata?.full_name as string | undefined) ??
        (data.user.user_metadata?.name as string | undefined) ??
        profile?.full_name ??
        "";
      setFullName(metaName);
      const metaAvatar = data.user.user_metadata?.avatar_url as string | undefined;
      setAvatarUrl(profile?.avatar_url ?? metaAvatar ?? null);
    });
  }, [navigate]);

  // debounced handle check
  useEffect(() => {
    if (!handle) {
      setHandleStatus("idle");
      return;
    }
    if (!handleRegex.test(handle)) {
      setHandleStatus("invalid");
      return;
    }
    setHandleStatus("checking");
    const t = setTimeout(async () => {
      try {
        const r = await checkFn({ data: { handle } });
        if (r.available) setHandleStatus("available");
        else setHandleStatus(r.reason === "reserved" ? "reserved" : "taken");
      } catch {
        setHandleStatus("idle");
      }
    }, 400);
    return () => clearTimeout(t);
  }, [handle, checkFn]);

  async function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !uid) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image must be under 4 MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${uid}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { url } = await signFn({ data: { path } });
      setAvatarPath(path);
      setAvatarUrl(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z
      .object({
        full_name: z.string().trim().min(1, "Enter your name").max(80),
        handle: z
          .string()
          .trim()
          .min(3, "Handle must be at least 3 characters")
          .max(20)
          .regex(handleRegex, "Only letters, numbers, and underscores"),
      })
      .safeParse({ full_name: fullName, handle });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    if (handleStatus === "taken" || handleStatus === "reserved") {
      toast.error("Please pick a different handle");
      return;
    }
    setSaving(true);
    try {
      await completeFn({
        data: {
          full_name: parsed.data.full_name,
          handle: parsed.data.handle,
          avatar_url: avatarUrl,
        },
      });
      toast.success("You're in.");
      navigate({ to: postAuthTarget(), replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  const handleBlocked =
    !handle ||
    handleStatus === "checking" ||
    handleStatus === "taken" ||
    handleStatus === "reserved" ||
    handleStatus === "invalid";
  const canContinue = !!fullName.trim() && !handleBlocked && !saving && !uploading;

  const { hint, tone } = handleHint(handleStatus, handle);

  return (
    <FlowShell signedInEmail={email}>
      <FlowHeading title="Hello, Nice to meet you! 👋" subtitle="How do we call you?" />

      <FlowBody as="form" size="sm" onSubmit={handleSubmit} noValidate className="gap-5">
        {/* Avatar: dashed placeholder until a photo is picked. */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label={avatarUrl ? "Change profile photo" : "Add a profile photo"}
            className={`group relative grid size-[120px] place-items-center overflow-hidden rounded-full transition-colors ${
              avatarUrl
                ? "border border-border"
                : "border border-dashed border-tertiary/60 bg-hover hover:bg-border/60"
            }`}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="size-full object-cover" />
            ) : (
              <ImageSquare className="size-[57px] text-tertiary" weight="regular" />
            )}
            <span
              className={`absolute inset-0 grid place-items-center bg-black/55 text-white transition-opacity ${
                uploading
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
              }`}
            >
              {uploading ? (
                <CircleNotch className="size-6 animate-spin" weight="bold" />
              ) : (
                <Camera className="size-6" weight="bold" />
              )}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarPick}
          />
          <p className="text-hint text-tertiary">
            {avatarUrl ? "Tap to change photo" : "Add a profile photo (optional)"}
          </p>
        </div>

        <FlowField
          id="name"
          name="name"
          autoComplete="name"
          aria-label="Your name"
          placeholder="Your Name"
          required
          maxLength={80}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <FlowField
          id="handle"
          name="handle"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-label="User id"
          placeholder="@user_id"
          required
          value={handle ? `@${handle}` : ""}
          onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20))}
          tone={tone}
          hint={hint}
          trailing={<HandleStatusIcon status={handleStatus} />}
        />

        <button type="submit" disabled={!canContinue} className={`${btnPrimary} w-full`}>
          {saving ? (
            <>
              <CircleNotch className="size-4 animate-spin" weight="bold" />
              Saving
            </>
          ) : (
            "Continue"
          )}
        </button>
      </FlowBody>
    </FlowShell>
  );
}

function HandleStatusIcon({ status }: { status: string }) {
  if (status === "checking") return <CircleNotch className="size-4 animate-spin" weight="bold" />;
  if (status === "available") return <Check className="size-4 text-success" weight="bold" />;
  if (status === "taken" || status === "reserved" || status === "invalid")
    return <X className="size-4 text-destructive" weight="bold" />;
  return null;
}

function handleHint(
  status: string,
  handle: string,
): { hint: string; tone: "default" | "error" | "success" } {
  switch (status) {
    case "available":
      return { hint: `@${handle} is available!`, tone: "success" };
    case "taken":
      return { hint: "That user id is taken", tone: "error" };
    case "reserved":
      return { hint: "That user id is reserved", tone: "error" };
    case "invalid":
      return { hint: "3–20 letters, numbers or underscores", tone: "error" };
    case "checking":
      return { hint: "Checking…", tone: "default" };
    default:
      return { hint: "Pick a unique user id.", tone: "default" };
  }
}
