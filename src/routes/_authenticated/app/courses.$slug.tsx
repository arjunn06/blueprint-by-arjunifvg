import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCourse, getLessonVideoUrl, setLessonComplete } from "@/lib/courses.functions";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronLeft, Copy, Play } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Card, formatDuration } from "@/components/app/sidebar";
import { ProgressBar } from "@/components/app/ui-kit";
import { btnPrimary, btnSecondary, btnSm } from "@/components/site/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/courses/$slug")({
  validateSearch: (s) => z.object({ lesson: z.string().optional().catch(undefined) }).parse(s),
  component: CoursePlayer,
});

function CoursePlayer() {
  const { slug } = Route.useParams();
  const { lesson: lessonParam } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const get = useServerFn(getCourse);
  const mark = useServerFn(setLessonComplete);
  const { data, isLoading } = useQuery({
    queryKey: ["course", slug],
    queryFn: () => get({ data: { slug } }),
  });
  const activeId = lessonParam ?? null;
  const setActiveId = (id: string) =>
    navigate({ to: ".", search: { lesson: id }, replace: true, resetScroll: false });
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});

  const mut = useMutation({
    mutationFn: (v: { lesson_id: string; completed: boolean }) => mark({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["course", slug] }),
  });

  const completed = useMemo(
    () => new Set(data?.completedLessonIds ?? []),
    [data?.completedLessonIds],
  );

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data) return null;

  const { course, modules, lessons } = data;
  const active = lessons.find((l) => l.id === activeId) ?? lessons[0];
  const totalDuration = lessons.reduce((s, l) => s + (l.duration_seconds ?? 0), 0);
  const pct = lessons.length ? Math.round((completed.size / lessons.length) * 100) : 0;

  const activeModule = modules.find((m) => m.id === active?.module_id);
  const activeIndex = modules.findIndex((m) => m.id === active?.module_id);

  async function copyLink() {
    if (!active) return;
    const url = new URL(window.location.href);
    url.searchParams.set("lesson", active.id);
    try {
      await navigator.clipboard.writeText(url.toString());
      toast.success("Lesson link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  }

  return (
    <>
      <Link
        to="/app/courses"
        className="mb-6 inline-flex items-center gap-1.5 text-hint font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> All courses
      </Link>

      <div className="grid gap-8 xl:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
        {/* Chapters (Figma "Course Side Pane") */}
        <aside className="order-2 flex min-h-0 flex-col gap-3 xl:order-1 xl:sticky xl:top-6 xl:max-h-[calc(100dvh-3rem)] xl:self-start">
          <div className="rounded-panel border border-border bg-surface p-5 shadow-card">
            <p className="text-hint text-muted-foreground">Course</p>
            <h2 className="mt-1 text-lead font-medium leading-snug">{course.title}</h2>
            <p className="mt-3 flex items-center justify-between text-hint text-muted-foreground">
              <span>
                {modules.length} modules · {lessons.length} lessons
              </span>
              <span>{formatDuration(totalDuration)}</span>
            </p>
            <div className="mt-3 flex items-center gap-3">
              <ProgressBar value={pct} className="flex-1" />
              <span className="text-hint tabular-nums text-muted-foreground">{pct}%</span>
            </div>
          </div>

          <div className="no-scrollbar flex min-h-0 flex-col gap-3 overflow-y-auto">
            {modules.map((m, mi) => {
              const mLessons = lessons.filter((l) => l.module_id === m.id);
              const done = mLessons.filter((l) => completed.has(l.id)).length;
              const hasActive = mLessons.some((l) => l.id === active?.id);
              const isOpen = openModules[m.id] ?? hasActive ?? true;
              return (
                <section
                  key={m.id}
                  className="overflow-hidden rounded-panel border border-border bg-surface"
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenModules((p) => ({ ...p, [m.id]: !isOpen }))}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left",
                      isOpen && "border-b border-border",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-btn">
                        {String(mi + 1).padStart(2, "0")} · {m.title}
                      </span>
                      <span className="block text-hint text-muted-foreground">
                        {done}/{mLessons.length} complete
                      </span>
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-5 shrink-0 text-muted-foreground transition-transform",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>
                  {isOpen && (
                    <ul className="flex flex-col gap-2.5 p-4">
                      {mLessons.map((l) => {
                        const isActive = active?.id === l.id;
                        const isDone = completed.has(l.id);
                        return (
                          <li key={l.id}>
                            <button
                              type="button"
                              aria-current={isActive ? "true" : undefined}
                              onClick={() => setActiveId(l.id)}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-btn transition-colors",
                                isActive ? "bg-blue-10 text-active" : "hover:bg-hover",
                              )}
                            >
                              <span className="flex size-4 shrink-0 items-center justify-center">
                                {isDone ? (
                                  <Check className="size-4 text-success" />
                                ) : (
                                  <Play
                                    className={cn(
                                      "size-3.5",
                                      isActive ? "fill-current" : "text-tertiary",
                                    )}
                                  />
                                )}
                              </span>
                              <span className="min-w-0 flex-1 truncate">{l.title}</span>
                              {l.duration_seconds && (
                                <span className="text-hint tabular-nums text-tertiary">
                                  {formatDuration(l.duration_seconds)}
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                      {mLessons.length === 0 && (
                        <li className="px-4 py-2 text-hint text-muted-foreground">No lessons</li>
                      )}
                    </ul>
                  )}
                </section>
              );
            })}
            {modules.length === 0 && (
              <p className="rounded-panel border border-dashed border-border p-5 text-hint text-muted-foreground">
                Curriculum coming soon.
              </p>
            )}
          </div>
        </aside>

        {/* Lesson */}
        <div className="order-1 min-w-0 space-y-6 xl:order-2">
          {active && (
            <header className="flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-btn">
                  {activeModule
                    ? `${activeIndex >= 0 ? `Chapter ${activeIndex + 1} · ` : ""}${activeModule.title}`
                    : course.title}
                </p>
                <h1 className="mt-3 text-balance text-[1.75rem] font-semibold leading-tight tracking-[-0.01em] md:text-title">
                  {active.title}
                </h1>
                {active.duration_seconds && (
                  <p className="mt-1.5 text-hint text-muted-foreground">
                    {formatDuration(active.duration_seconds)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={copyLink}
                  className={`${btnSecondary} ${btnSm} shadow-btn-md`}
                >
                  <Copy className="size-4" /> Copy link
                </button>
                <button
                  type="button"
                  disabled={mut.isPending}
                  onClick={() =>
                    mut.mutate({
                      lesson_id: active.id,
                      completed: !completed.has(active.id),
                    })
                  }
                  className={cn(
                    completed.has(active.id) ? btnSecondary : btnPrimary,
                    btnSm,
                    "disabled:opacity-60",
                  )}
                >
                  {completed.has(active.id) ? (
                    <>
                      <Check className="size-4 text-success" /> Completed
                    </>
                  ) : (
                    "Mark complete"
                  )}
                </button>
              </div>
            </header>
          )}

          <div className="relative aspect-video overflow-hidden rounded-[34px] border border-border bg-black">
            {active?.video_url ? (
              <VideoEmbed key={active.id} url={active.video_url} lessonId={active.id} />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-sm text-white/60">
                No video yet
              </div>
            )}
          </div>

          {active?.description && (
            <Card className="p-6">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {active.description}
              </p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function VideoEmbed({ url, lessonId }: { url: string; lessonId: string }) {
  const getSigned = useServerFn(getLessonVideoUrl);
  const [signed, setSigned] = useState<string | null>(null);
  const isHosted = url.startsWith("storage:");
  useEffect(() => {
    if (!isHosted) return;
    let cancelled = false;
    const load = () =>
      getSigned({ data: { lesson_id: lessonId } })
        .then((r: any) => {
          if (!cancelled) setSigned(r.url);
        })
        .catch(() => {});
    load();
    // Refresh the signed URL well before it expires (25 min).
    const t = setInterval(load, 25 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [isHosted, lessonId, getSigned]);

  if (isHosted) {
    if (!signed) {
      return (
        <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">
          Loading video…
        </div>
      );
    }
    return <ProtectedVideo src={signed} />;
  }

  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (yt)
    return (
      <iframe
        className="absolute inset-0 h-full w-full"
        src={`https://www.youtube.com/embed/${yt[1]}`}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    );
  if (vimeo)
    return (
      <iframe
        className="absolute inset-0 h-full w-full"
        src={`https://player.vimeo.com/video/${vimeo[1]}`}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    );
  return <ProtectedVideo src={url} className="absolute inset-0 h-full w-full" />;
}

function ProtectedVideo({ src, className }: { src: string; className?: string }) {
  return (
    <video
      src={src}
      controls
      controlsList="nodownload noremoteplayback noplaybackrate"
      disablePictureInPicture
      onContextMenu={(e) => e.preventDefault()}
      className={className ?? "absolute inset-0 h-full w-full select-none"}
    />
  );
}
