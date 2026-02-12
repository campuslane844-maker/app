import React, { useCallback, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { MotiView } from "moti";

import JokeTemplate, { Joke } from "@/components/fun-break/jokes/JokeTemplate";
import { FUN_JOKES } from "@/data/jokes/jokes";

export default function FunJokesPage() {
  const router = useRouter();

  const total = FUN_JOKES.length;

  const scrollRef = useRef<ScrollView>(null);

  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState(0);

  const finished = index >= total;

  const current: Joke | null = useMemo(() => {
    if (finished) return null;
    return FUN_JOKES[index] as Joke;
  }, [index, finished]);

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleNext = useCallback(() => {
    if (finished) return;

    setCompleted((c) => c + 1);

    const next = index + 1;
    setIndex(next);

    scrollToTop();
  }, [index, finished]);

  const progressFraction = Math.max(0, Math.min(1, completed / total));
  const percent = total > 0 ? Math.round(progressFraction * 100) : 0;

  const restart = () => {
    setIndex(0);
    setCompleted(0);
    scrollToTop();
  };

  return (
    <View className="flex-1 bg-primary">
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: 50,
          gap: 16,
        }}
      >
        {/* Header */}
        <View className="flex-col gap-4">
          <Text className="font-heading1 text-4xl text-white text-center">
            FUN JOKES
          </Text>

          <Text className="font-heading1 text-sm text-white/70 text-center">
            Laugh break — reveal punchline to unlock the video.
          </Text>
        </View>

        {/* Progress */}
        <View>
          <View className="flex-row justify-between mb-2">
            {!finished ? (
              <Text className="font-heading1 text-sm text-white/80">
                Joke {index + 1} of {total}
              </Text>
            ) : (
              <Text className="font-heading1 text-sm text-white/80">
                Finished
              </Text>
            )}

            <Text className="font-heading1 text-sm text-white/80">
              {completed} Completed
            </Text>
          </View>

          <View className="w-full h-5 rounded-full bg-gray-300 overflow-hidden shadow-inner">
            <MotiView
              from={{ width: "0%" }}
              animate={{ width: `${Math.round(progressFraction * 100)}%` }}
              transition={{ type: "timing", duration: 450 }}
              className="h-full rounded-full bg-orange-500"
            />
          </View>

          <Text className="mt-2 font-heading1 text-xs text-white/70 text-center">
            {percent}% done
          </Text>
        </View>

        {/* Joke Template / Finished */}
        {!finished && current ? (
          <JokeTemplate key={index} data={current} onNext={handleNext} />
        ) : (
          <View className="bg-white rounded-3xl p-7 border border-gray-200">
            <Text className="font-heading1 text-4xl text-green-600 text-center">
              ALL DONE
            </Text>

            <Text className="mt-4 font-heading1 text-center text-gray-700">
              You finished all {total} jokes.
            </Text>

            <View className="mt-6 flex-row justify-center gap-4">
              <Pressable
                onPress={restart}
                className="rounded-full bg-orange-500 px-7 py-4"
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text className="font-heading1 text-base text-white">
                  Restart
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.push("/fun-break/jokes")}
                className="rounded-full bg-gray-800 px-7 py-4"
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text className="font-heading1 text-base text-white">
                  Home
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Footer tip */}
        <Text className="text-center font-heading1 text-white/70 text-sm mt-2">
          Tip: Reveal punchline to unlock the funny video.
        </Text>
      </ScrollView>
    </View>
  );
}
