import React, { useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Image, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { MotiView } from "moti";

import RiddleTemplate, { Riddle } from "@/components/fun-break/riddles/RiddleTemplate";
import PuzzleRiddleTemplate, {
  PuzzleRiddle,
} from "@/components/fun-break/riddles/PuzzleRiddleTemplate";

import { MATH_RIDDLES } from "@/data/riddles/math";
import { AppHeader } from "@/components/AppHeader";

const AWS_URL = process.env.EXPO_PUBLIC_AWS_URL;

// Discriminated union helper
type AnyMathRiddle = Riddle | PuzzleRiddle;

const isPuzzleRiddle = (item: AnyMathRiddle): item is PuzzleRiddle => {
  return (item as PuzzleRiddle)?.interaction === "puzzle";
};

export default function MathRiddlesPage() {
  const router = useRouter();
  const total = MATH_RIDDLES.length;

  const scrollRef = useRef<ScrollView>(null);

  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [score, setScore] = useState(0);

  const finished = index >= total;

  const current: AnyMathRiddle | null = useMemo(() => {
    if (finished) return null;
    return MATH_RIDDLES[index] as AnyMathRiddle;
  }, [index, finished]);

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleAttempt = (isCorrect: boolean) => {
    if (isCorrect) setScore((prev) => prev + 10);
  };

  const handleNext = () => {
    setCompleted((c) => c + 1);

    const next = index + 1;
    if (next >= total) {
      setIndex(total);
      scrollToTop();
      return;
    }

    setIndex(next);
    scrollToTop();
  };

  const handleRetry = () => {
    scrollToTop();
  };

  const restart = () => {
    setIndex(0);
    setCompleted(0);
    setScore(0);
    scrollToTop();
  };

  const progressFraction = Math.max(0, Math.min(1, completed / total));
  const percent = total > 0 ? Math.round(progressFraction * 100) : 0;

  // ⚠️ Use PNG in RN (SVG won't work with <Image /> unless you use react-native-svg)
  const coinGraphic = `${AWS_URL}/graphic/coin.png`;

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
          <Text className="text-4xl font-heading1 tracking-wider text-white text-center">
            MATH PUZZLES
          </Text>

          {/* Score pill */}
          <View className="self-center flex-row items-center gap-3 rounded-full bg-white px-6 py-3 shadow-lg">
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
            <Text className="text-sm font-heading1 text-white/80">
              Puzzle {Math.min(index + 1, total)} of {total}
            </Text>
            <Text className="text-sm font-heading1 text-white/80">{completed} Completed</Text>
          </View>

          <View className="w-full h-5 rounded-full bg-gray-300 overflow-hidden shadow-inner">
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

        {/* Template */}
        {!finished && current ? (
          isPuzzleRiddle(current) ? (
            <PuzzleRiddleTemplate
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
          )
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

            <Text className="mt-4 text-center text-gray-700">
              You finished all puzzles. You scored{" "}
              <Text className="font-heading1">{score}</Text> points.
            </Text>

            <Text className="text-6xl font-heading1 mt-6 text-center text-gray-900">
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
                <Text className="text-white text-base font-heading1">
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
                <Text className="text-white text-base font-heading1">
                  Home
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Footer tip */}
        <Text className="font-heading1 text-center text-white/70 text-sm mt-2">
          Tip: Score updates on correct puzzles. Progress updates when you press{" "}
          <Text className="font-heading1">Next</Text>.
        </Text>
      </ScrollView>
    </View>
  );
}
