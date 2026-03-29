import React from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { FileText, Lock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Progress } from "@/types";
import { useSubscriptionStore } from '@/lib/store/subscription';
import { useAuthStore } from '@/lib/store/auth';

export type ContentCardItem = {
  _id: string;
  title: string;
  type?: string;
  paid?: boolean;
  thumbnailKey?: string;
  progress?: Progress;
};

export default function ContentCard({ content }: { content: ContentCardItem }) {
  const router = useRouter();
  const { subscription } = useSubscriptionStore();
  const { user, isAuthenticated } = useAuthStore();
  const isTeacher = user?.role === 'teacher';

  const isSubscriptionValid =
    subscription &&
    new Date(isTeacher ? subscription?.endDate || '' : subscription?.currentEnd || '') > new Date();

  const isTeacherPaidPlan = isTeacher && isSubscriptionValid && subscription?.isFree === false;

  const isLocked = isTeacher
    ? content.paid === true && !isTeacherPaidPlan
    : content.paid === true && !isSubscriptionValid;

  const progress: Progress = content.progress ?? {
    status: 'not_started',
    completed: false,
  };

  const thumbnailUrl = content.thumbnailKey
    ? `${process.env.EXPO_PUBLIC_AWS_URL}/${content.thumbnailKey}`
    : 'https://via.placeholder.com/640x360?text=Content';

  const handleOpen = () => {
    if (isLocked) return;

    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }

    router.push({
      pathname: "/worksheets/content/[id]",
      params: { id: content._id },
    });
  };

  return (
    <Pressable onPress={handleOpen} style={[styles.card, isLocked && styles.cardLocked]}>
      {/* LOCK OVERLAY */}
      {isLocked && (
        <View style={styles.lockOverlay}>
          <Lock size={32} color="#fff" />
        </View>
      )}

      {/* STATUS BADGE */}
      {progress.status !== 'not_started' && (
        <View
          style={[
            styles.statusBadge,
            progress.status === 'completed' ? styles.completed : styles.inProgress,
          ]}>
          <Text style={styles.statusText}>
            {progress.status === 'completed' ? 'Completed' : 'In Progress'}
          </Text>
        </View>
      )}

      {/* THUMBNAIL */}
      <View style={styles.thumbnailWrapper}>
        <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} resizeMode="cover" />
      </View>

      {/* PROGRESS BAR */}
      {content.type === 'video' && progress.status !== 'not_started' && (
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progress.progressPercent ?? 0}%` }]} />
        </View>
      )}

      {/* CONTENT INFO */}
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={2} className='font-heading1'>
            {content.title}
          </Text>
        </View>

        <View style={styles.meta}>
          <FileText size={12} color="#6B7280" />
          <Text style={styles.metaText} className="font-sans">
            {content.type}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    overflow: 'hidden',
    marginBottom: 10,
  },
  cardLocked: {
    opacity: 0.9,
  },

  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  lockTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginVertical: 12,
  },
  subscribeBtn: {
    backgroundColor: '#F97316',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  subscribeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  statusBadge: {
    position: 'absolute',
    top: -5,
    right: -6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    zIndex: 10,
  },
  completed: {
    backgroundColor: '#22C55E',
  },
  inProgress: {
    backgroundColor: '#FACC15',
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  thumbnailWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#E5E7EB',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },

  progressBg: {
    height: 6,
    backgroundColor: '#E5E7EB',
  },
  progressFill: {
    height: 6,
    backgroundColor: '#22C55E',
  },
  titleContainer: {
    height: 40,
    justifyContent: 'flex-start',
  },

  title: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1F2937',
  },

  content: {
    padding: 12,
    gap: 6,
  },
 
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'uppercase',
  },

  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignSelf: 'flex-start',
  },
  downloadText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
