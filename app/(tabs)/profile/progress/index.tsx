import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import api from "@/lib/api";
import { AppHeader } from "@/components/AppHeader";
import {
  Award,
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileText,
  Flame,
  Layers,
  Play,
  Sparkles,
  Star,
  Trophy,
  Video,
} from "lucide-react-native";

/* ---------------- Types ---------------- */
type DailyBucket = {
  date: string; // ISO date string or day start
  completedCount: number;
  timeSpentSeconds: number;
};

type WeeklyBucket = {
  weekStart: string;
  completedCount: number;
  timeSpentSeconds: number;
};

type MonthlyBucket = {
  monthStart: string;
  completedCount: number;
  timeSpentSeconds: number;
};

type Chapter = {
  title?: string;
  chapterId: string;
  total: number;
  completed: number;
  percentage: number;
};

type Subject = {
  title?: string;
  subjectId: string;
  total: number;
  completed: number;
  percentage: number;
  chapters: Chapter[];
};

type ClassData = {
  title?: string;
  classId: string;
  total: number;
  completed: number;
  percentage: number;
  subjects: Subject[];
};

type ApiResponse = {
  success: boolean;
  overall: {
    totalContents: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    percentage: number;
  };
  byType: {
    file?: { completed: number; total: number };
    video?: { completed: number; total: number; sessions: number; timeSpent: number };
    quiz?: { completed: number; total: number; avgScore: number };
    image?: { completed: number; total: number };
  };
  weekly: WeeklyBucket[];
  monthly: MonthlyBucket[];
  // if your backend doesn't provide daily yet, we will derive from recent.
  daily?: DailyBucket[];

  classes: ClassData[];
  recent: any[];
  watchHistory: any[];
};

/* ---------------- Helpers ---------------- */
const AWS_URL = process.env.EXPO_PUBLIC_AWS_URL || "";

const resolveImg = (v?: string) => {
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  if (!AWS_URL) return v;
  return `${AWS_URL}/${v.replace(/^\//, "")}`;
};

const clamp = (n: number, a = 0, b = 100) => Math.max(a, Math.min(b, n));

const formatTime = (seconds?: number) => {
  if (!seconds || seconds <= 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const formatDate = (iso?: string) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
};

const formatDay = (iso?: string) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, { weekday: "short" });
  } catch {
    return "";
  }
};

const startOfDayKey = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

function daysBetween(a: Date, b: Date) {
  const A = new Date(a);
  const B = new Date(b);
  A.setHours(0, 0, 0, 0);
  B.setHours(0, 0, 0, 0);
  const diff = A.getTime() - B.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

/* ---------------- UI primitives ---------------- */
function Card({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "soft";
}) {
  const cls =
    variant === "soft"
      ? "rounded-3xl border border-gray-200 bg-gray-50 p-4"
      : "rounded-3xl border border-gray-200 bg-white p-4";

  return <View className={cls}>{children}</View>;
}

function IconPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1 rounded-2xl border border-gray-200 bg-white px-3 py-3">
      <View className="flex-row items-center justify-between">
        <View className="h-9 w-9 rounded-2xl bg-primary/10 border border-primary/15 items-center justify-center">
          {icon}
        </View>
        <Text className="font-heading2 text-xl text-gray-900">{value}</Text>
      </View>
      <Text className="mt-2 font-sans text-xs font-semibold text-gray-500">{label}</Text>
    </View>
  );
}

function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <View className="flex-row items-start justify-between">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/15 items-center justify-center">
          {icon}
        </View>

        <View>
          <Text className="font-heading2 text-lg text-gray-900">{title}</Text>
          {!!subtitle && <Text className="mt-0.5 font-sans text-xs text-gray-500">{subtitle}</Text>}
        </View>
      </View>
    </View>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  const p = clamp(Math.round(pct));
  return (
    <View className="mt-2 h-3 rounded-full bg-gray-200 overflow-hidden">
      <View className="h-3 rounded-full bg-green-500" style={{ width: `${p}%` }} />
    </View>
  );
}

/* ---------------- Hero ---------------- */
function ProgressHero({
  pct,
  total,
  completed,
  inProgress,
  streakDays,
  lastActiveLabel,
}: {
  pct: number;
  total: number;
  completed: number;
  inProgress: number;
  streakDays: number;
  lastActiveLabel: string;
}) {
  const p = clamp(Math.round(pct));

  return (
    <View className="px-4 pt-5">
      <View className="rounded-[28px] border border-gray-200 bg-white overflow-hidden">
        {/* soft header gradient */}
        <View className="bg-primary/10 px-4 py-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="font-heading1 text-2xl text-gray-900">Progress</Text>
              <Text className="mt-1 font-sans text-xs text-gray-600">
                Keep going — small steps every day.
              </Text>
            </View>

            <View className="rounded-2xl border border-primary/20 bg-white px-3 py-2 flex-row items-center gap-2">
              <Flame size={16} color="#2563eb" />
              <Text className="font-sans text-xs font-extrabold text-gray-900">
                {streakDays} day streak
              </Text>
            </View>
          </View>
        </View>

        <View className="px-4 py-4">
          <View className="flex-row items-center gap-4">
            {/* progress ring-ish */}
            <View className="h-28 w-28 rounded-full bg-primary/10 border border-primary/15 items-center justify-center">
              <View className="h-20 w-20 rounded-full bg-white border border-gray-200 items-center justify-center">
                <Text className="font-heading1 text-2xl text-gray-900">{p}%</Text>
                <Text className="font-sans text-[11px] text-gray-500 -mt-1">Completed</Text>
              </View>
            </View>

            <View className="flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="font-sans font-extrabold text-gray-900">Overall</Text>
                <Text className="font-sans text-xs font-bold text-gray-600">
                  {completed}/{total}
                </Text>
              </View>

              <ProgressBar pct={p} />

              <View className="mt-3 flex-row flex-wrap gap-2">
                <View className="rounded-full bg-green-50 border border-green-100 px-3 py-1.5 flex-row items-center gap-2">
                  <Trophy size={14} color="#16a34a" />
                  <Text className="font-sans text-xs font-bold text-green-700">
                    Completed {completed}
                  </Text>
                </View>

                <View className="rounded-full bg-blue-50 border border-blue-100 px-3 py-1.5 flex-row items-center gap-2">
                  <Layers size={14} color="#2563eb" />
                  <Text className="font-sans text-xs font-bold text-blue-700">
                    In progress {inProgress}
                  </Text>
                </View>
              </View>

              <View className="mt-3 flex-row items-center gap-2">
                <CalendarDays size={14} color="#64748b" />
                <Text className="font-sans text-xs text-gray-500">{lastActiveLabel}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

/* ---------------- Daily streak section ---------------- */
function DailyStreak({
  daily,
}: {
  daily: { date: string; completedCount: number; timeSpentSeconds: number }[];
}) {
  const items = daily
    .slice()
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, 10);

  const max = Math.max(1, ...items.map((d) => d.completedCount || 0));

  return (
    <Card>
      <SectionTitle
        icon={<Flame size={18} color="#2563eb" />}
        title="Daily Streak"
        subtitle="Last 10 days"
      />

      <View className="mt-4 gap-3">
        {items.length === 0 ? (
          <Text className="font-sans text-sm text-gray-500">No daily activity yet.</Text>
        ) : (
          items.map((d) => {
            const pct = Math.round(((d.completedCount || 0) / max) * 100);
            return (
              <View
                key={d.date}
                className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="font-sans font-extrabold text-gray-900">
                    {formatDay(d.date)} • {formatDate(d.date)}
                  </Text>

                  <Text className="font-sans text-xs font-bold text-gray-700">
                    {d.completedCount || 0} lessons
                  </Text>
                </View>

                <View className="mt-2 h-3 rounded-full bg-gray-200 overflow-hidden">
                  <View className="h-3 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </View>

                <View className="mt-2 flex-row items-center gap-2">
                  <Clock3 size={14} color="#64748b" />
                  <Text className="font-sans text-xs text-gray-500">
                    Watch time: {formatTime(d.timeSpentSeconds || 0)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </Card>
  );
}

/* ---------------- Monthly section (simple) ---------------- */
function MonthlySummary({ monthly }: { monthly: MonthlyBucket[] }) {
  const items = (monthly || [])
    .slice()
    .sort((a, b) => +new Date(b.monthStart) - +new Date(a.monthStart))
    .slice(0, 6);

  const max = Math.max(1, ...items.map((m) => m.completedCount || 0));

  const monthLabel = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
    } catch {
      return iso;
    }
  };

  return (
    <Card>
      <SectionTitle
        icon={<BarChart3 size={18} color="#2563eb" />}
        title="Monthly Summary"
        subtitle="Last 6 months"
      />

      <View className="mt-4 gap-3">
        {items.length === 0 ? (
          <Text className="font-sans text-sm text-gray-500">No monthly data yet.</Text>
        ) : (
          items.map((m) => {
            const pct = Math.round(((m.completedCount || 0) / max) * 100);

            return (
              <View
                key={m.monthStart}
                className="rounded-2xl border border-gray-200 bg-white px-3 py-3"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="font-sans font-extrabold text-gray-900">
                    {monthLabel(m.monthStart)}
                  </Text>

                  <Text className="font-sans text-xs font-bold text-gray-700">
                    {m.completedCount || 0} lessons
                  </Text>
                </View>

                <View className="mt-2 h-3 rounded-full bg-gray-200 overflow-hidden">
                  <View className="h-3 rounded-full bg-green-500" style={{ width: `${pct}%` }} />
                </View>
              </View>
            );
          })
        )}
      </View>
    </Card>
  );
}

/* ---------------- Expandable tree ---------------- */
function ClassesTree({ classes }: { classes: ClassData[] }) {
  if (!classes || classes.length === 0) {
    return (
      <Card>
        <SectionTitle
          icon={<Award size={18} color="#2563eb" />}
          title="Progress by Class"
          subtitle="No class progress yet"
        />
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle
        icon={<Award size={18} color="#2563eb" />}
        title="Progress by Class"
        subtitle="Tap to open subjects and chapters"
      />

      <View className="mt-4 gap-3">
        {classes.map((cls) => (
          <ClassNode key={cls.classId} cls={cls} />
        ))}
      </View>
    </Card>
  );
}

function ClassNode({ cls }: { cls: ClassData }) {
  const [open, setOpen] = useState(false);

  return (
    <View className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3">
      <Pressable onPress={() => setOpen((s) => !s)} className="flex-row items-center">
        <View className="flex-1">
          <Text className="font-sans font-extrabold text-gray-900">
            {cls.title || "Class"}
          </Text>
          <Text className="mt-1 font-sans text-xs text-gray-500">
            {cls.completed}/{cls.total} lessons
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          <View className="rounded-full bg-white border border-gray-200 px-3 py-1">
            <Text className="font-sans text-xs font-bold text-gray-700">
              {Math.round(cls.percentage)}%
            </Text>
          </View>
          {open ? (
            <ChevronDown size={18} color="#334155" />
          ) : (
            <ChevronRight size={18} color="#334155" />
          )}
        </View>
      </Pressable>

      <ProgressBar pct={cls.percentage} />

      {open && (
        <View className="mt-3 gap-2">
          {(cls.subjects || []).map((sub) => (
            <SubjectNode key={sub.subjectId} sub={sub} />
          ))}
        </View>
      )}
    </View>
  );
}

function SubjectNode({ sub }: { sub: Subject }) {
  const [open, setOpen] = useState(false);

  return (
    <View className="rounded-2xl border border-gray-200 bg-white px-3 py-3">
      <Pressable onPress={() => setOpen((s) => !s)} className="flex-row items-center">
        <View className="flex-1">
          <Text className="font-sans font-bold text-gray-900">{sub.title || "Subject"}</Text>
          <Text className="mt-1 font-sans text-xs text-gray-500">
            {sub.completed}/{sub.total} lessons
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          <View className="rounded-full bg-gray-50 border border-gray-200 px-3 py-1">
            <Text className="font-sans text-xs font-bold text-gray-700">
              {Math.round(sub.percentage)}%
            </Text>
          </View>
          {open ? (
            <ChevronDown size={18} color="#334155" />
          ) : (
            <ChevronRight size={18} color="#334155" />
          )}
        </View>
      </Pressable>

      <ProgressBar pct={sub.percentage} />

      {open && (
        <View className="mt-3 gap-2">
          {(sub.chapters || []).map((ch) => (
            <View
              key={ch.chapterId}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
            >
              <View className="flex-row items-center justify-between">
                <Text className="font-sans text-sm font-semibold text-gray-900">
                  {ch.title || "Chapter"}
                </Text>
                <Text className="font-sans text-xs text-gray-500">
                  {ch.completed}/{ch.total}
                </Text>
              </View>
              <ProgressBar pct={ch.percentage} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/* ---------------- Recent (thumbnail list) ---------------- */
function RecentList({ items }: { items: any[] }) {
  const list = (items || []).slice(0, 10);

  const iconForType = (type?: string) => {
    const t = String(type || "file");
    if (t === "video") return <Video size={18} color="#2563eb" />;
    if (t === "quiz") return <Star size={18} color="#2563eb" />;
    return <FileText size={18} color="#2563eb" />;
  };

  return (
    <Card>
      <SectionTitle
        icon={<Sparkles size={18} color="#2563eb" />}
        title="Recent Activity"
        subtitle="Tap any lesson to open"
      />

      <View className="mt-4 gap-3">
        {list.length === 0 ? (
          <Text className="font-sans text-sm text-gray-500">No recent activity yet.</Text>
        ) : (
          list.map((r) => {
            const thumb = resolveImg(r.image);
            const type = String(r.type || "file").toUpperCase();
            const when = formatDate(r.updatedAt || r.completedAt || r.lastWatchedAt);

            return (
              <Pressable
                key={r._id}
                onPress={() => router.push(`/(tabs)/home/content/${r.contentId}` as any)}
                className="flex-row items-center gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-3"
              >
                {/* Thumbnail */}
                <View className="h-16 w-16 overflow-hidden rounded-2xl bg-gray-100 border border-gray-200">
                  {thumb ? (
                    <Image
                      source={{ uri: thumb }}
                      style={{ height: "100%", width: "100%" }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="flex-1 items-center justify-center">
                      {iconForType(r.type)}
                    </View>
                  )}
                </View>

                {/* Text */}
                <View className="flex-1">
                  <Text className="font-sans font-extrabold text-gray-900" numberOfLines={2}>
                    {r.title}
                  </Text>

                  <Text className="mt-1 font-sans text-xs text-gray-500">
                    {type} • {when}
                  </Text>
                </View>

                {/* CTA */}
                <View className="h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 border border-primary/15">
                  <Play size={18} color="#2563eb" />
                </View>
              </Pressable>
            );
          })
        )}
      </View>
    </Card>
  );
}

/* ========================================================= */
export default function ProgressKidsPage() {
  const params = useLocalSearchParams();
  const studentId = params?.id ? String(params.id) : null;

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);

    try {
      const url = studentId
        ? `/progress/child/${studentId}?recentLimit=12&watchLimit=10`
        : `/progress/mine?recentLimit=12&watchLimit=10`;

      const res = await api.get(url);
      setData(res.data);
    } catch (e) {
      console.error(e);
      setError("Could not load progress. Pull to refresh.");
    }
  }, [studentId]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        await fetchData();
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  }, [fetchData]);

  /* ---------------- Derived daily activity ----------------
     If backend does NOT give daily buckets,
     we derive from recent[] (best effort).
  --------------------------------------------------------- */
  const dailyBuckets = useMemo(() => {
    const explicit = (data as any)?.daily;
    if (Array.isArray(explicit) && explicit.length > 0) return explicit;

    const recent = data?.recent || [];
    const map: Record<string, DailyBucket> = {};

    for (const r of recent) {
      const iso = r.completedAt || r.updatedAt || r.lastWatchedAt;
      if (!iso) continue;

      const key = startOfDayKey(iso);
      if (!key) continue;

      if (!map[key]) {
        map[key] = { date: key, completedCount: 0, timeSpentSeconds: 0 };
      }

      // if completedAt exists -> count as completed
      if (r.completedAt) map[key].completedCount += 1;
    }

    return Object.values(map).sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [data]);

  const streakDays = useMemo(() => {
    if (!dailyBuckets || dailyBuckets.length === 0) return 0;

    const today = new Date();
    const sorted = dailyBuckets
      .slice()
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));

    // if last activity isn't today or yesterday, streak is 0
    const last = new Date(sorted[0].date);
    const gap = daysBetween(today, last);

    if (gap > 1) return 0;

    let streak = 0;
    let cursor = new Date(today);
    cursor.setHours(0, 0, 0, 0);

    // allow today with 0 completions if yesterday had activity? no.
    // We only count days that exist in buckets and have completedCount > 0.
    while (true) {
      const key = cursor.toISOString();
      const bucket = sorted.find((b) => startOfDayKey(b.date) === key);

      if (!bucket || (bucket.completedCount || 0) <= 0) break;

      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    // if today has 0 but yesterday has >0, streak should still be 1
    // We'll handle that:
    if (streak === 0) {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      y.setHours(0, 0, 0, 0);
      const yBucket = sorted.find((b) => startOfDayKey(b.date) === y.toISOString());
      if (yBucket && (yBucket.completedCount || 0) > 0) return 1;
    }

    return streak;
  }, [dailyBuckets]);

  const lastActiveLabel = useMemo(() => {
    const recent = data?.recent || [];
    if (recent.length === 0) return "No recent activity";

    const latest =
      recent
        .map((r: any) => r.updatedAt || r.completedAt || r.lastWatchedAt)
        .filter(Boolean)
        .sort((a: string, b: string) => +new Date(b) - +new Date(a))[0] || null;

    if (!latest) return "No recent activity";
    return `Last active • ${formatDate(latest)}`;
  }, [data?.recent]);

  const strongestClass = useMemo(() => {
    const classes = data?.classes || [];
    if (classes.length === 0) return null;

    const best = classes.slice().sort((a, b) => (b.percentage || 0) - (a.percentage || 0))[0];
    return { title: best.title || "Class", pct: Math.round(best.percentage || 0) };
  }, [data?.classes]);

  const overallPct = clamp(data?.overall?.percentage ?? 0);

  const total = data?.overall?.totalContents ?? 0;
  const completed = data?.overall?.completed ?? 0;
  const inProgress = data?.overall?.inProgress ?? 0;
  const notStarted = data?.overall?.notStarted ?? 0;

  const filesDone = data?.byType?.file?.completed ?? 0;
  const filesTotal = data?.byType?.file?.total ?? 0;

  const videoDone = data?.byType?.video?.completed ?? 0;
  const videoTotal = data?.byType?.video?.total ?? 0;
  const videoSessions = data?.byType?.video?.sessions ?? 0;
  const videoTime = data?.byType?.video?.timeSpent ?? 0;

  const quizDone = data?.byType?.quiz?.completed ?? 0;
  const quizTotal = data?.byType?.quiz?.total ?? 0;
  const quizAvg = data?.byType?.quiz?.avgScore ?? 0;

  const avgPerDay = useMemo(() => {
    const buckets = dailyBuckets.slice(0, 7);
    if (buckets.length === 0) return 0;
    const sum = buckets.reduce((s, b) => s + (b.completedCount || 0), 0);
    return Math.round((sum / buckets.length) * 10) / 10;
  }, [dailyBuckets]);

  /* ---------------- Loading ---------------- */
  if (loading) {
    return (
      <View className="flex-1 bg-background">
        <AppHeader />
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator />
          <Text className="font-sans text-gray-600">Loading progress…</Text>
        </View>
      </View>
    );
  }

  /* ========================================================= */
  return (
    <View className="flex-1 bg-background">
      <AppHeader />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ProgressHero
          pct={overallPct}
          total={total}
          completed={completed}
          inProgress={inProgress}
          streakDays={streakDays}
          lastActiveLabel={lastActiveLabel}
        />

        {/* Error */}
        {error && (
          <View className="px-4 mt-4">
            <View className="rounded-3xl border border-red-200 bg-red-50 px-4 py-4">
              <Text className="font-sans font-extrabold text-red-700">{error}</Text>
            </View>
          </View>
        )}

        {/* Stats row 1 */}
        <View className="px-4 mt-4">
          <View className="flex-row gap-3">
            <IconPill
              icon={<Trophy size={18} color="#2563eb" />}
              label="Completed"
              value={String(completed)}
            />
            <IconPill
              icon={<Layers size={18} color="#2563eb" />}
              label="In progress"
              value={String(inProgress)}
            />
          </View>

          <View className="flex-row gap-3 mt-3">
            <IconPill
              icon={<Star size={18} color="#2563eb" />}
              label="Avg per day"
              value={String(avgPerDay)}
            />
            <IconPill
              icon={<CalendarDays size={18} color="#2563eb" />}
              label="Not started"
              value={String(notStarted)}
            />
          </View>
        </View>

        {/* Stats row 2 */}
        <View className="px-4 mt-4">
          <Card variant="soft">
            <SectionTitle
              icon={<Sparkles size={18} color="#2563eb" />}
              title="Learning Breakdown"
              subtitle="By content type"
            />

            <View className="mt-4 gap-3">
              <View className="flex-row gap-3">
                <IconPill
                  icon={<FileText size={18} color="#2563eb" />}
                  label="Worksheets"
                  value={`${filesDone}/${filesTotal}`}
                />
                <IconPill
                  icon={<Video size={18} color="#2563eb" />}
                  label="Videos"
                  value={`${videoDone}/${videoTotal}`}
                />
              </View>

              <View className="flex-row gap-3">
                <IconPill
                  icon={<Play size={18} color="#2563eb" />}
                  label="Video sessions"
                  value={String(videoSessions)}
                />
                <IconPill
                  icon={<Clock3 size={18} color="#2563eb" />}
                  label="Watch time"
                  value={formatTime(videoTime)}
                />
              </View>

              <View className="flex-row gap-3">
                <IconPill
                  icon={<Star size={18} color="#2563eb" />}
                  label="Quizzes"
                  value={`${quizDone}/${quizTotal}`}
                />
                <IconPill
                  icon={<Award size={18} color="#2563eb" />}
                  label="Quiz average"
                  value={`${Math.round(quizAvg)}%`}
                />
              </View>

              {strongestClass && (
                <View className="rounded-2xl border border-gray-200 bg-white px-3 py-3">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <View className="h-9 w-9 rounded-2xl bg-green-50 border border-green-100 items-center justify-center">
                        <Award size={18} color="#16a34a" />
                      </View>
                      <View>
                        <Text className="font-sans font-extrabold text-gray-900">
                          Strongest class
                        </Text>
                        <Text className="font-sans text-xs text-gray-500">
                          {strongestClass.title}
                        </Text>
                      </View>
                    </View>

                    <View className="rounded-full bg-green-50 border border-green-100 px-3 py-1">
                      <Text className="font-sans text-xs font-extrabold text-green-700">
                        {strongestClass.pct}%
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </Card>
        </View>

        {/* Daily streak */}
        <View className="px-4 mt-4">
          <DailyStreak daily={dailyBuckets} />
        </View>

        {/* Monthly */}
        <View className="px-4 mt-4">
          <MonthlySummary monthly={data?.monthly || []} />
        </View>

        {/* Class tree */}
        <View className="px-4 mt-4">
          <ClassesTree classes={data?.classes || []} />
        </View>

        {/* Recent */}
        <View className="px-4 mt-4">
          <RecentList items={data?.recent || []} />
        </View>

        <View className="h-10" />
      </ScrollView>
    </View>
  );
}
