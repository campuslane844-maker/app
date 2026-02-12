import React, { useCallback, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { MotiView } from "moti";

import TongueTwisterTemplate from "@/components/fun-break/tongue-twisters/TongueTwisterTemplate";
import { TONGUE_TWISTERS } from "@/data/tongue-twisters/index";

export default function FunTongueTwistersPage() {
  const router = useRouter();
  const total = TONGUE_TWISTERS.length;

  const scrollRef = useRef<ScrollView>(null);

  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState(0);

  const finished = index >= total;

  const current = useMemo(() => {
    if (finished) return null;
    return TONGUE_TWISTERS[index];
  }, [index, finished]);

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleNext = useCallback(() => {
    if (finished) return;

    setCompleted((c) => c + 1);
    setIndex((i) => i + 1);

    scrollToTop();
  }, [finished]);

  const handlePrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
    scrollToTop();
  }, []);

  const restart = () => {
    setIndex(0);
    setCompleted(0);
    scrollToTop();
  };

  const progressFraction = Math.max(0, Math.min(1, completed / total));
  const percent = total > 0 ? Math.round(progressFraction * 100) : 0;

  return (
    <View className="flex-1 bg-primary">
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: 60,
          gap: 16,
        }}
      >
        {/* Header */}
        <View className="gap-3">
          <Text className="text-center font-heading1 text-4xl tracking-wide text-white">
            TONGUE TWISTERS
          </Text>

          <Text className="text-center font-heading1 text-sm text-white/80">
            {finished ? "Done!" : `Twister ${index + 1} of ${total}`}
          </Text>
        </View>

        {/* Progress */}
        <View className="mt-2">
          <View className="mb-2 flex-row justify-between">
            <Text className="font-heading1 text-sm text-white/80">
              {completed} Completed
            </Text>
            <Text className="font-heading1 text-sm text-white/80">
              {percent}%
            </Text>
          </View>

          <View className="h-3 w-full overflow-hidden rounded-full bg-gray-300 shadow-inner">
            <MotiView
              from={{ width: "0%" }}
              animate={{ width: `${percent}%` }}
              transition={{ type: "timing", duration: 450 }}
              className="h-full rounded-full bg-orange-500"
            />
          </View>
        </View>

        {/* Controls */}
        {!finished && (
          <View className="mt-2 flex-row justify-center gap-3">
            <Pressable
              onPress={handlePrev}
              disabled={index === 0}
              className={`rounded-full px-6 py-3 ${
                index === 0 ? "bg-gray-700/50" : "bg-gray-700"
              }`}
              style={({ pressed }) => ({
                transform: [{ scale: pressed ? 0.98 : 1 }],
                opacity: index === 0 ? 0.6 : pressed ? 0.88 : 1,
              })}
            >
              <Text className="font-heading1 text-base text-white">
                Previous
              </Text>
            </Pressable>

            <Pressable
              onPress={handleNext}
              className="rounded-full bg-orange-500 px-6 py-3"
              style={({ pressed }) => ({
                transform: [{ scale: pressed ? 0.98 : 1 }],
                opacity: pressed ? 0.88 : 1,
              })}
            >
              <Text className="font-heading1 text-base text-white">Next</Text>
            </Pressable>
          </View>
        )}

        {/* Content */}
        {!finished && current ? (
          <TongueTwisterTemplate
            key={current.id}
            data={current}
            onNext={handleNext}
            nextLabel="Next"
            homeLabel="Home"
          />
        ) : (
          <View className="rounded-2xl border border-gray-200 bg-white p-7">
            <Text className="text-center font-heading1 text-4xl text-green-600">
              ALL DONE
            </Text>

            <Text className="mt-4 text-center font-heading1 text-gray-700">
              You finished the {total} tongue twisters!
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
                onPress={() => router.push("/fun-break")}
                className="rounded-full bg-gray-800 px-7 py-4"
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text className="font-heading1 text-base text-white">Home</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Footer tip */}
        <Text className="mt-2 text-center font-heading1 text-sm text-white/70">
          Tip: On mobile, use Previous/Next buttons to navigate.
        </Text>
      </ScrollView>
    </View>
  );
}
