import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Pdf from 'react-native-pdf';

import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth';

import QuizSection from '@/components/QuizSection';
import ContentCard from '@/components/ContentCard';
import {
  BookOpen,
  Download,
  Gamepad2,
  Paintbrush2,
  Puzzle,
  Sparkles,
  Sprout,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppHeader';

export interface Question {
  questionText: string;
  s3Key?: string;
  options: string[];
  correctOption: number;
}

export type ContentItem = {
  _id: string;
  title: string;
  description?: string;
  thumbnailKey?: string;
  s3Key?: string;
  type?: string;
  createdAt?: string;
  questions?: Question[];
  quizType?: 'native' | 'googleForm';
};

type ProgressPayload = {
  _id?: string;
  studentId?: string;
  contentId?: string;
  status?: 'not_started' | 'in_progress' | 'completed';
  timeSpent?: number;
  lastWatchedSecond?: number;
  progressPercent?: number;
  quizScore?: number | null;
  completedAt?: string | null;
};

const QUICK_LINKS = [
  {
    label: 'Fun Break',
    href: '/fun-break',
    desc: 'Short activities to relax',
    bg: 'bg-yellow-50',
    icon: Sparkles,
  },
  {
    label: 'Worksheet Zone',
    href: '/worksheet-zone/classes',
    desc: 'Explore study material',
    bg: 'bg-green-50',
    icon: Download,
  },
  {
    label: 'Vocabulary',
    href: '/(tabs)/explore/coming-soon',
    desc: 'Learn new words',
    bg: 'bg-pink-50',
    icon: BookOpen,
  },
  {
    label: 'Yoga Zone',
    href: '/(tabs)/explore/coming-soon',
    desc: 'Learn yoga asanas daily',
    bg: 'bg-orange-50',
    icon: Sprout,
  },
  {
    label: 'Spoken English Zone',
    href: '/(tabs)/explore/coming-soon',
    desc: 'Watch interactive lessons',
    bg: 'bg-purple-50',
    icon: Puzzle,
  },
  {
    label: 'Art Lab',
    href: '/(tabs)/explore/coming-soon',
    desc: 'Learn art and craft',
    bg: 'bg-red-50',
    icon: Paintbrush2,
  },
  {
    label: 'Learn & Play',
    href: '/(tabs)/explore/coming-soon',
    desc: 'Interactive learning games',
    bg: 'bg-blue-50',
    icon: Gamepad2,
  },
];

const AWS_URL = process.env.EXPO_PUBLIC_AWS_URL || '';

export default function ContentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated } = useAuthStore();

  const [content, setContent] = useState<ContentItem | null>(null);
  const [localFileUri, setLocalFileUri] = useState<string | null>(null);

  const [otherContent, setOtherContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCompleted, setIsCompleted] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [progress, setProgress] = useState<ProgressPayload | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPingRef = useRef<number>(0);

  const PING_INTERVAL_SEC = 15;
  const MAX_PING_SECONDS = 300;

  const progressPercent = Math.min(100, Math.max(0, progress?.progressPercent ?? 0));

  const contentUrl = content?.s3Key ? `${AWS_URL}/${content.s3Key}` : '';

  const filePreviewUri = localFileUri ?? `${contentUrl}#zoom=page-width`;

  // expo-video player (only meaningful when content is video)
  const player = useVideoPlayer(content?.type === 'video' ? contentUrl : '', (p) => {
    p.loop = false;
  });

  // ---------------- Fetch other content ----------------
  useEffect(() => {
    let mounted = true;

    async function fetchOther() {
      try {
        const res = await api.get('/content');
        const items = (res.data.data || []).filter((c: ContentItem) => c._id !== id);
        if (mounted) setOtherContent(items);
      } catch (err) {
        console.error('Failed to fetch other content', err);
      }
    }

    if (id) fetchOther();
    return () => {
      mounted = false;
    };
  }, [id]);

  // ---------------- Fetch content + open progress ----------------
  useEffect(() => {
    let mounted = true;

    async function fetchContent() {
      try {
        if (!id) return;

        const res = await api.get(`/content/${id}`);
        if (!mounted) return;

        setContent(res.data.data);

        try {
          const openRes = await api.post('/progress/open', { contentId: id });
          if (openRes?.data?.data && mounted) {
            setProgress(openRes.data.data);
            setIsCompleted(openRes.data.data.status === 'completed');
          }
        } catch (e) {
          console.warn('open progress failed', e);
        }
      } catch (err) {
        console.error('Failed to fetch content:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchContent();

    return () => {
      mounted = false;
    };
  }, [id]);

  // ---------------- Ping logic ----------------
  const pingVideoProgress = useCallback(
    async (elapsedSeconds: number) => {
      if (!content?._id) return;
      if (elapsedSeconds <= 0) return;

      let elapsed = elapsedSeconds;
      if (elapsed > MAX_PING_SECONDS) elapsed = MAX_PING_SECONDS;

      try {
        setPinging(true);

        const pingRes = await api.post('/progress/video/ping', {
          contentId: content._id,
          secondsSinceLastPing: elapsed,
        });

        if (pingRes?.data?.data) {
          setProgress(pingRes.data.data);
          setIsCompleted(pingRes.data.data.status === 'completed');
        }
      } catch (err) {
        console.error('video ping failed', err);
      } finally {
        setPinging(false);
      }
    },
    [content?._id]
  );

  // Start interval based on expo-video player
  const startPingInterval = useCallback(() => {
    if (!player || !content?._id) return;

    const startingPoint = progress?.lastWatchedSecond ?? Math.floor(player.currentTime ?? 0);

    lastPingRef.current = Math.floor(startingPoint);

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(async () => {
      try {
        if (!player.playing) return;

        const now = Math.floor(player.currentTime ?? 0);
        let elapsed = now - lastPingRef.current;

        if (elapsed <= 0) return;
        if (elapsed > MAX_PING_SECONDS) elapsed = MAX_PING_SECONDS;

        lastPingRef.current = now;
        await pingVideoProgress(elapsed);
      } catch (e) {
        console.warn('ping interval error', e);
      }
    }, PING_INTERVAL_SEC * 1000);
  }, [player, content?._id, progress?.lastWatchedSecond, pingVideoProgress]);

  const stopPingInterval = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!player || !content?._id) return;

    try {
      const now = Math.floor(player.currentTime ?? 0);
      let elapsed = now - lastPingRef.current;

      if (elapsed <= 0) return;
      if (elapsed > MAX_PING_SECONDS) elapsed = MAX_PING_SECONDS;

      await pingVideoProgress(elapsed);
    } catch (e) {
      console.warn('stopPingInterval failed', e);
    }
  }, [player, content?._id, pingVideoProgress]);

  const handleVideoEnd = useCallback(async () => {
    await stopPingInterval();

    if (!content?._id) return;

    try {
      const res = await api.post('/progress/complete', { contentId: content._id });
      if (res?.data?.data) {
        setProgress(res.data.data);
        setIsCompleted(res.data.data.status === 'completed');
      } else {
        setIsCompleted(true);
      }
    } catch (err) {
      console.error('complete failed', err);
    }
  }, [content?._id, stopPingInterval]);

  // ---------------- Seek to last watched (expo-video) ----------------
  useEffect(() => {
    if (!player) return;
    if (content?.type !== 'video') return;

    const last = progress?.lastWatchedSecond ?? 0;
    if (last <= 0) return;

    // Avoid jumping repeatedly
    const current = Math.floor(player.currentTime ?? 0);
    if (Math.abs(current - last) <= 1) return;

    try {
      player.currentTime = last;
      lastPingRef.current = last;
    } catch {}
  }, [player, content?.type, progress?.lastWatchedSecond]);

  // ---------------- Subscribe to player events ----------------
  useEffect(() => {
    if (!player) return;
    if (content?.type !== 'video') return;

    const t = setInterval(() => {
      // start/stop interval based on player.playing
      if (player.playing) startPingInterval();
      else stopPingInterval();

      // end detection fallback (works even if events differ)
      const current = Math.floor(player.currentTime ?? 0);
      const duration = Math.floor(player.duration ?? 0);

      if (duration > 0 && current >= duration - 1) {
        handleVideoEnd();
      }
    }, 800);

    return () => clearInterval(t);
  }, [player, content?.type, startPingInterval, stopPingInterval, handleVideoEnd]);

  // ---------------- AppState final ping ----------------
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        await stopPingInterval();
      }
    });

    return () => {
      sub.remove();
    };
  }, [stopPingInterval]);

  // ---------------- Mark complete (non-video) ----------------
  const handleMarkComplete = async () => {
    if (!content?._id) return;

    try {
      const res = await api.post('/progress/complete', { contentId: content._id });
      if (res?.data?.data) {
        setProgress(res.data.data);
        setIsCompleted(res.data.data.status === 'completed');
      } else {
        setIsCompleted(true);
      }
    } catch (err) {
      console.error('Failed to complete content:', err);
    }
  };

  // ---------------- Download (safe for your SDK) ----------------
  const handleDownload = async () => {
    if (!content?.s3Key) return;

    try {
      const url = `${AWS_URL}/${content.s3Key}`;

      // keep extension (important for iOS)
      const ext = content.s3Key.split('.').pop() || 'pdf';
      const safeName = (content.title || 'download').replace(/[^\w\d-_]+/g, '_');
      const filename = `${safeName}.${ext}`;

      const baseDir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory;

      if (!baseDir) {
        console.warn('No writable directory found.');
        return;
      }

      const localPath = `${baseDir}${filename}`;

      const res = await FileSystem.downloadAsync(url, localPath);

      // Share sheet (Save to Files, WhatsApp, Drive, etc.)
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(res.uri);
      } else {
        console.log('Saved at:', res.uri);
      }
    } catch (e) {
      console.error('Download failed', e);
    }
  };

  // ---------------- Quiz submit ----------------
  const handleQuizSubmit = async (finalScore: number) => {
    if (!content?._id) return;

    try {
      const res = await api.post('/progress/complete', {
        contentId: content._id,
        quizScore: finalScore,
      });

      if (res?.data?.data) {
        setProgress(res.data.data);
        setIsCompleted(res.data.data.status === 'completed');
      } else {
        setIsCompleted(true);
      }
    } catch (err) {
      console.error('quiz submit failed', err);
    }
  };

  // ---------------- Related content placeholders ----------------
  const visibleOtherContent = useMemo(() => {
    const VISIBLE_COUNT = 5;
    const placeholdersNeeded = Math.max(0, VISIBLE_COUNT - otherContent.length);

    return [
      ...otherContent.slice(0, VISIBLE_COUNT),
      ...Array.from({ length: placeholdersNeeded }).map(
        (_, i) =>
          ({
            _id: `placeholder-${i}`,
            title: 'Coming soon',
            type: 'file',
          }) as ContentItem
      ),
    ];
  }, [otherContent]);

  // ---------------- Loading / not found ----------------
  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" />
        <Text className="font-heading3" style={styles.loadingTitle}>
          Loading content…
        </Text>
        <Text className="font-sans" style={styles.loadingSub}>
          Fetching your lesson and progress.
        </Text>
      </View>
    );
  }

  if (!content) {
    return (
      <View style={styles.notFoundWrap}>
        <Text className="font-heading3" style={styles.notFoundTitle}>
          Content not found
        </Text>
        <Text className="font-sans" style={styles.notFoundSub}>
          The item you were looking for does not exist or may have been removed.
        </Text>

        <Pressable style={styles.outlineBtn} onPress={() => router.push('/(tabs)/home')}>
          <Text style={styles.outlineBtnText}>Back to library</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <AppHeader showBack/>
      <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
        {/* ===== Theatre ===== */}
        <View style={styles.theatre}>
          <View style={styles.theatreCard}>
            {content.type === 'video' && !!contentUrl ? (
              <VideoView
                style={styles.video}
                player={player}
                nativeControls
                allowsFullscreen
                allowsPictureInPicture={false}
              />
            ) : content.type === 'quiz' && content.quizType === 'native' ? (
              <View style={styles.quizWrap}>
                <QuizSection content={content} onSubmitScore={handleQuizSubmit} />
              </View>
            ) : content.type === 'file' && contentUrl ? (
              <Pressable style={styles.pdfWrap} onPress={() => Linking.openURL(contentUrl)}>
                <Pdf
                  
                  source={{ uri: contentUrl, cache: true }}
                  style={styles.pdf}
                  trustAllCerts={false}
                  onLoadComplete={(pages) => console.log('PDF loaded, pages:', pages)}
                  onError={(err) => console.log('PDF error:', err)}
                />
              </Pressable>
            ) : content.type === 'image' && !!contentUrl ? (
              <View style={styles.imageWrap}>
                <WebView source={{ uri: contentUrl }} />
              </View>
            ) : (
              <View style={styles.previewNA}>
                <Text style={styles.previewNAText}>Preview not available</Text>
              </View>
            )}
          </View>

          {/* ===== Side panel ===== */}
          <View style={styles.sidePanel}>
            <Pressable style={styles.outlineBtn} onPress={() => router.back()}>
              <Text className="font-sans">Back</Text>
            </Pressable>


            {content.type !== 'video' && !isCompleted && isAuthenticated && (
              <Pressable style={styles.outlineBtn} onPress={handleMarkComplete}>
                <Text className="font-sans">Mark as completed</Text>
              </Pressable>
            )}

            {isCompleted && (
              <View style={styles.completedPill}>
                <Text className="font-sans" style={styles.completedText}>
                  Completed
                </Text>
              </View>
            )}

            {content.type === 'video' && (
              <View style={styles.progressWrap}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Progress</Text>
                  <Text style={styles.progressLabel}>{progressPercent.toFixed(0)}%</Text>
                </View>

                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                </View>

                {pinging && <Text style={styles.pingingText}>Saving…</Text>}
              </View>
            )}
          </View>
        </View>

        {/* ===== Details ===== */}
        <View style={styles.details}>
          <Text className="font-heading1" style={styles.title}>
            {content.title}
          </Text>

          <View style={styles.metaRow}>
            <Text className='font-sans' style={styles.metaText}>{(content.type ?? 'file').toUpperCase()}</Text>
            {!!content.createdAt && (
              <Text className='font-sans' style={styles.metaText}>
                {new Date(content.createdAt).toLocaleDateString()}
              </Text>
            )}
          </View>

          <Text className="font-sans" style={styles.description}>
            {content.description ?? 'No description provided.'}
          </Text>
        </View>

        {/* ===== Quick Links ===== */}
        <View style={styles.section}>
          <Text className="font-heading2" style={styles.sectionTitle}>
            Quick Links
          </Text>

          <FlatList
            data={QUICK_LINKS}
            keyExtractor={(item) => item.label}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickList}
            renderItem={({ item }) => {
              const Icon = item.icon;

              return (
                <Pressable
                  onPress={() => router.push(item.href as any)}
                  className={`${item.bg} flex flex-row items-center gap-2 rounded-full border border-gray-200 p-2`}
                  style={({ pressed }) => [
                    styles.quickCard,
                    { backgroundColor: item.bg },
                    pressed && { opacity: 0.9 },
                  ]}>
                  <View>
                    <Icon size={20} color="#0f172a" />
                  </View>

                  <View>
                    <Text className="font-sans" numberOfLines={1}>
                      {item.label}
                    </Text>
                  </View>
                </Pressable>
              );
            }}
          />
        </View>

        {/* ===== Related Content ===== */}
        <View style={styles.section}>
          <Text className="font-heading2" style={styles.sectionTitle}>
            Also view
          </Text>

          <FlatList
            data={visibleOtherContent}
            keyExtractor={(item) => item._id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 14 }}
            renderItem={({ item }) => (
              <View style={{ width: 260 }}>
                <ContentCard content={item} />
              </View>
            )}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fafafa' },
  pageContent: { paddingBottom: 28 },

  loadingWrap: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  loadingTitle: { fontSize: 18, fontWeight: '700', color: '#334155' },
  loadingSub: { fontSize: 13, color: '#64748b' },

  notFoundWrap: { flex: 1, padding: 20, backgroundColor: '#f5f5f5', gap: 12 },
  notFoundTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  notFoundSub: { fontSize: 13, color: '#64748b' },

  theatre: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },
  theatreCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: { width: '100%', height: 220, backgroundColor: '#000' },

  quizWrap: { backgroundColor: '#fff', padding: 12 },
  webviewWrap: { height: 520, backgroundColor: '#fff' },
  pdfWrap: {
    height: 520,
    backgroundColor: '#fff',
  },

  pdf: {
    flex: 1,
    width: '100%',
    height: '100%',
  },

  webLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  webLoadingText: { fontSize: 13, color: '#64748b' },

  imageWrap: { height: 420, backgroundColor: '#000' },

  previewNA: { height: 220, alignItems: 'center', justifyContent: 'center' },
  previewNAText: { color: '#fff', fontSize: 14, opacity: 0.85 },

  sidePanel: { gap: 10 },

  outlineBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  outlineBtnText: { fontWeight: '700', color: '#0f172a' },

  primaryBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '800' },

  completedPill: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  completedText: { color: '#166534', fontWeight: '800' },

  progressWrap: { paddingTop: 6, gap: 8 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  progressTrack: {
    height: 8,
    borderRadius: 99,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  progressFill: { height: 8, backgroundColor: '#10b981' },
  pingingText: { fontSize: 12, color: '#64748b' },

  details: { paddingHorizontal: 16, paddingTop: 18, gap: 8 },
  title: { fontSize: 26, color: '#000' },
  metaRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  metaText: { fontSize: 12, color: 'rgba(0,0,0,0.65)', fontWeight: '700' },
  description: { marginTop: 10, fontSize: 14, color: '#334155', lineHeight: 20 },

  section: { paddingHorizontal: 16, paddingTop: 18, gap: 12 },
  sectionTitle: { fontSize: 16, color: '#0f172a' },

  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  quickIconWrap: {
    height: 44,
    width: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',

    // icon shadow
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  quickTextWrap: {
    flex: 1,
    gap: 2,
  },

  quickArrow: {
    height: 34,
    width: 34,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },

  quickArrowText: {
    fontSize: 22,
    fontWeight: '900',
    color: 'rgba(15, 23, 42, 0.55)',
    marginTop: -2,
  },

  quickList: {
    paddingVertical: 6,
    gap: 8,
  },

  quickCard: {
    width: 320,
    height: 110,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,

    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,

    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },

  quickIconBox: {
    height: 46,
    width: 46,
    borderRadius: 14,
    backgroundColor: '#fff',

    alignItems: 'center',
    justifyContent: 'center',

    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',

    // super soft shadow like screenshot
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  quickText: {
    flex: 1,
    gap: 3,
  },

  quickTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },

  quickDesc: {
    fontSize: 13,
    color: 'rgba(15, 23, 42, 0.55)',
    fontWeight: '600',
  },
});
