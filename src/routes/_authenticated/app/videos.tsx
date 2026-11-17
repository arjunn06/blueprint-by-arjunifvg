import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Check, MagnifyingGlass, Play, VideoCamera } from "@phosphor-icons/react";
import { getCourse, listCourses } from "@/lib/courses.functions";
import { formatDuration } from "@/components/app/sidebar";
import { EmptyState, MemberHeader, SkeletonBlock } from "@/components/app/ui-kit";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/app/videos")({
  head: () => ({ meta: [{ title: "Videos | Blueprint" }] }),
  component: Videos,
});

/** Every video lesson across all courses, in course order. Rows open the lesson in the player. */
function Videos() {
  const list = useServerFn(listCourses);
  const get = useServerFn(getCourse);
  const [q, setQ] = useState("");

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses", "list"],
    queryFn: () => list(),
  });
  // Same query key as the course player, so opening a lesson reuses the cached course.
  const details = useQueries({
    queries: (courses ?? []).map((c) => ({
      queryKey: ["course", c.slug],
      queryFn: () => get({ data: { slug: c.slug } }),
    })),
  });

  const loading = isLoading || details.some((d) => d.isLoading);
  const needle = q.trim().toLowerCase();

  const groups = useMemo(() => {
    return (courses ?? [])
      .map((c, i) => {
        const d = details[i]?.data;
        if (!d) return null;
        const done = new Set(d.completedLessonIds ?? []);
        const moduleTitle = new Map(d.modules.map((m) => [m.id, m.title]));
        const rows = d.lessons
          .filter((l) => l.video_url)
          .map((l) => ({
            id: l.id,
            title: l.title,
            module: moduleTitle.get(l.module_id) ?? "",
            duration: l.duration_seconds,
            done: done.has(l.id),
          }))
          .filter((r) => !needle || `${r.title} ${r.module}`.toLowerCase().includes(needle));
        return rows.length ? { course: c, rows } : null;
      })
      .filter((g): g is NonNullable<typeof g> => g !== null);
  }, [courses, details, needle]);

  const total = groups.reduce((s, g) => s + g.rows.length, 0);

  return (
    <div>
      <MemberHeader
        title="Videos"
        description="Every video lesson across your courses in one list."
      />

      <div className="relative mb-8 max-w-md">
        <MagnifyingGlass
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-tertiary"
        />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search videos"
          aria-label="Search videos"
          className="h-12 pl-12"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonBlock key={i} className="h-14" />
          ))}
        </div>
      ) : total === 0 ? (
        <EmptyState
          icon={<VideoCamera className="size-5" />}
          title={needle ? "No videos match your search" : "No videos yet"}
          body={
            needle ? "Try a different word." : "New sessions appear here as soon as they go live."
          }
        />
      ) : (
        <div className="space-y-10">
          {groups.map(({ course, rows }) => (
            <section key={course.id} aria-labelledby={`v-${course.id}`}>
              <h2
                id={`v-${course.id}`}
                className="mb-3 flex items-baseline justify-between gap-4 text-lead font-medium"
              >
                {course.title}
                <span className="text-hint font-normal text-muted-foreground">
                  {rows.length} {rows.length === 1 ? "video" : "videos"}
                </span>
              </h2>
              <ul className="flex flex-col gap-2.5">
                {rows.map((r) => (
                  <li key={r.id}>
                    <Link
                      to="/app/courses/$slug"
                      params={{ slug: course.slug }}
                      search={{ lesson: r.id }}
                      className="flex items-center gap-4 rounded-field border border-border bg-surface px-5 py-4 shadow-card transition-colors hover:bg-hover"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-10 text-active">
                        {r.done ? (
                          <Check className="size-4 text-success" weight="bold" />
                        ) : (
                          <Play className="size-3.5" weight="fill" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-btn">{r.title}</span>
                        {r.module && (
                          <span className="block truncate text-hint text-muted-foreground">
                            {r.module}
                          </span>
                        )}
                      </span>
                      {r.duration ? (
                        <span className="text-hint tabular-nums text-tertiary">
                          {formatDuration(r.duration)}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
