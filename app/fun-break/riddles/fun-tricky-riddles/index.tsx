import React, { useCallback, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Image, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { MotiView } from "moti";

import RiddleTemplate, { Riddle } from "@/components/fun-break/riddles/RiddleTemplate";
import { FUN_RIDDLES } from "@/data/riddles/fun-tricky";
import { AppHeader } from "@/components/AppHeader";

const AWS_URL = process.env.EXPO_PUBLIC_AWS_URL;

export default function FunRiddlesPage() {
  const router = useRouter();
  const total = FUN_RIDDLES.length;

  const scrollRef = useRef<ScrollView>(null);

  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [score, setScore] = useState(0);

  // store which riddle indexes already awarded points
  const [awardedSet, setAwardedSet] = useState<Set<number>>(() => new Set());

  // current attempted flag (gates Next)
  const [attempted, setAttempted] = useState(false);

  const finished = index >= total;

  const current: Riddle | null = useMemo(() => {
    if (finished) return null;
    return FUN_RIDDLES[index];
  }, [index, finished]);

  const progressFraction = useMemo(() => {
    return Math.max(0, Math.min(1, completed / total));
  }, [completed, total]);

  const coinGraphic = `${AWS_URL}/graphic/coin.png`;

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleNext = useCallback(() => {
    setCompleted((c) => c + 1);

    setIndex((prev) => prev + 1);
    setAttempted(false);

    scrollToTop();
  }, []);

  const handleRetry = () => {
    setAttempted(false);
    scrollToTop();
  };

  const handleAttempt = (isCorrect: boolean) => {
    setAttempted(true);

    // award once per riddle
    if (isCorrect && !awardedSet.has(index)) {
      setScore((prev) => prev + 10);

      setAwardedSet((prev) => {
        const next = new Set(prev);
        next.add(index);
        return next;
      });
    }
  };

  const restart = () => {
    setIndex(0);
    setCompleted(0);
    setScore(0);
    setAttempted(false);
    setAwardedSet(new Set());
    scrollToTop();
  };

  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

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
        {/* Header row */}
        <View className="flex-col gap-4">
          <Text className="text-4xl font-heading1 tracking-wide text-white text-center">
            FUN RIDDLES
          </Text>

          {/* Score pill */}
          <View className="self-center flex-row items-center gap-3 rounded-full bg-white px-6 py-3">
            <Image
              source={require("@/assets/images/coin.png")}
              resizeMode="contain"
              style={{ width: 30, height: 30 }}
            />
            <Text className="text-2xl font-heading1 text-gray-800">
              {score}
            </Text>
          </View>
        </View>

        {/* Progress */}
        <View>
          <View className="flex-row justify-between mb-2">
            {!finished ? (
              <Text className="text-sm font-heading1 text-white/80">
                Riddle {index + 1} of {total}
              </Text>
            ) : (
              <Text className="text-sm font-heading1  text-white/80">Finished</Text>
            )}

            <Text className="text-sm font-heading1  text-white/80">
              {completed} Completed
            </Text>
          </View>

          <View className="w-full h-5 rounded-full bg-gray-300 overflow-hidden">
            <MotiView
              from={{ width: "0%" }}
              animate={{ width: `${Math.round(progressFraction * 100)}%` }}
              transition={{ type: "timing", duration: 450 }}
              className="h-full rounded-full bg-orange-500"
            />
          </View>

          <Text className="text-xs font-heading1 text-white/70 mt-2 text-center">
            {percent}% Done
          </Text>
        </View>

        {/* Riddle / Finish screen */}
        {!finished && current ? (
          <RiddleTemplate
            key={index}
            data={current}
            onAttempt={handleAttempt}
            onNext={handleNext}
            onRetry={handleRetry}
            nextLabel="Next"
            retryLabel="Retry"
            homeLabel="Home"
          />
        ) : (
          <View className="bg-white rounded-2xl p-7 border border-gray-200">
            {total > 0 && score / 10 / total >= 0.5 ? (
              <Text className="text-4xl font-heading1 text-green-600 text-center">
                NICE WORK!
              </Text>
            ) : (
              <Text className="text-4xl font-heading1 text-red-500 text-center">
                TRY AGAIN!
              </Text>
            )}

            <Text className="mt-4 font-sans text-center text-gray-700">
              You finished all riddles. You scored{" "}
              <Text className="font-heading1 ">{score}</Text> points.
            </Text>

            <Text className="text-6xl font-heading1  mt-6 text-center text-gray-900">
              {score}
            </Text>

            <View className="mt-6 flex-row justify-center gap-4">
              <Pressable
                onPress={restart}
                className="rounded-full bg-orange-500 border border-gray-800 px-7 py-4"
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text className="text-white text-base font-heading1 ">
                  Restart
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.push("/fun-break/riddles")}
                className="rounded-full bg-gray-800 border border-gray-900 px-7 py-4"
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text className="text-white text-base ffont-heading1">
                  Home
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Footer tip */}
        <Text className="text-center font-heading1  text-white/70 text-sm mt-2">
          Tip: Each riddle awards points only once.
        </Text>
      </ScrollView>
    </View>
  );
}
