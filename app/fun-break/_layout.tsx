import React, { useEffect, useRef, useState } from "react";
import { View, Pressable } from "react-native";
import { Slot, usePathname, useRouter } from "expo-router";
import { Audio } from "expo-av";
import { ArrowLeft, Pause, Play, X } from "lucide-react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppHeader } from "@/components/AppHeader";

const AWS_URL = process.env.EXPO_PUBLIC_AWS_URL;

export default function FunBreakLayout() {
  const router = useRouter();
  const pathname = usePathname();

  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const stopAndUnload = async () => {
    try {
      if (!soundRef.current) return;
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    } catch {}
    setIsPlaying(false);
  };

  const startMusic = async () => {
    try {
      if (soundRef.current) return;

      const { sound } = await Audio.Sound.createAsync(
        { uri: `${AWS_URL}/music/fun-break.mp3` },
        { shouldPlay: true, isLooping: true, volume: 1 }
      );

      soundRef.current = sound;
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    const isFunBreakRoute = pathname?.startsWith("/fun-break");

    if (!isFunBreakRoute) {
      stopAndUnload();
      return;
    }

    startMusic();

    return () => {
      stopAndUnload();
    };
  }, [pathname]);

  const togglePlay = async () => {
    if (!soundRef.current) {
      await startMusic();
      return;
    }

    try {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch {}
  };

  return (
    <View className="flex-1 bg-primary">
      {/* Your normal header */}
      <AppHeader showBack />

      {/* Control bar BELOW header (not absolute) */}
      <View className="flex-row justify-end gap-2 px-4 pt-2 pb-3">
        {/* Back */}
        <Pressable
          onPress={() => router.back()}
          className="h-12 w-12 items-center justify-center rounded-full bg-white shadow"
        >
          <ArrowLeft size={20} color="#374151" />
        </Pressable>

        {/* Play / Pause */}
        <Pressable
          onPress={togglePlay}
          className="h-12 w-12 items-center justify-center rounded-full bg-white shadow"
        >
          {isPlaying ? (
            <Pause size={22} color="#374151" />
          ) : (
            <Play size={22} color="#374151" />
          )}
        </Pressable>

        {/* Close */}
        <Pressable
          onPress={() => router.push("/explore")}
          className="h-12 w-12 items-center justify-center rounded-full bg-white shadow"
        >
          <X size={20} color="#374151" />
        </Pressable>
      </View>

      {/* Page content */}
      <View className="flex-1">
        <Slot />
      </View>
    </View>
  );
}
