import React from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/lib/store/auth";
import { useSubscriptionStore } from "@/lib/store/subscription";
import { Lock } from "lucide-react-native";

export default function HomeContentCard({ content }: any) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { subscription } = useSubscriptionStore();

  const isLocked = content.paid && !subscription;

  const thumbnail = content.thumbnailKey
    ? `${process.env.EXPO_PUBLIC_AWS_URL}/${content.thumbnailKey}`
    : "https://via.placeholder.com/300x170";

  const progress = content.progress?.progressPercent ?? 0;

  const openContent = () => {
    if (isLocked) return;

    if (!isAuthenticated) {
      router.push("/auth");
      return;
    }

    router.push({
      pathname: "/worksheets/content/[id]",
      params: { id: content._id },
    });
  };

  return (
    <Pressable onPress={openContent} style={styles.card}>
      {/* Thumbnail */}
      <View style={styles.thumbWrapper}>
        <Image source={{ uri: thumbnail }} style={styles.thumbnail} />

        {isLocked && (
          <View style={styles.lock}>
            <Lock size={16} color="#fff" />
          </View>
        )}
      </View>

      {/* Progress */}
      {progress > 0 && (
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      )}

      {/* Title */}
      <Text numberOfLines={2} className="font-heading2 pl-1 mt-1">
        {content.title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 160,
    marginRight: 12,
  },

  thumbWrapper: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#e5e7eb",
  },

  thumbnail: {
    width: "100%",
    height: "100%",
  },

  lock: {
    position: "absolute",
    right: 6,
    top: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 6,
    padding: 4,
  },

  progressBg: {
    height: 4,
    backgroundColor: "#e5e7eb",
    borderRadius: 2,
    marginTop: 4,
  },

  progressFill: {
    height: 4,
    backgroundColor: "#22c55e",
    borderRadius: 2,
  },

});