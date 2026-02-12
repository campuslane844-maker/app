"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Image } from "react-native";
import { useRouter } from "expo-router";
import { Audio } from "expo-av";
import { AnimatePresence, MotiText, MotiView } from "moti";
import { RemoteSvg } from "@/components/RemoteSvg";

export type Riddle = {
  riddle: string;
  options: string[];
  answer: string;
  funFact: string;
};

const AWS_URL = process.env.EXPO_PUBLIC_AWS_URL;

type Props = {
  data: Riddle;
  onAttempt?: (isCorrect: boolean) => void;
  onNext?: () => void;
  onRetry?: () => void;
  nextLabel?: string;
  retryLabel?: string;
  homeLabel?: string;
};

export default function RiddleTemplate({
  data,
  onAttempt,
  onNext,
  onRetry,
  nextLabel = "Next",
  retryLabel = "Retry",
  homeLabel = "Home",
}: Props) {
  const router = useRouter();

  const [selected, setSelected] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [feedbackIdx, setFeedbackIdx] = useState<number | null>(null);
  const [lastWasCorrect, setLastWasCorrect] = useState<boolean | null>(null);

  // sounds
  const correctSoundRef = useRef<Audio.Sound | null>(null);
  const wrongSoundRef = useRef<Audio.Sound | null>(null);

  // preload sounds once
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const correct = await Audio.Sound.createAsync(
          { uri: `${AWS_URL}/sounds/correct.mp3` },
          { shouldPlay: false, volume: 1 }
        );

        const wrong = await Audio.Sound.createAsync(
          { uri: `${AWS_URL}/sounds/wrong.mp3` },
          { shouldPlay: false, volume: 1 }
        );

        if (!mounted) {
          await correct.sound.unloadAsync();
          await wrong.sound.unloadAsync();
          return;
        }

        correctSoundRef.current = correct.sound;
        wrongSoundRef.current = wrong.sound;
      } catch {}
    })();

    return () => {
      mounted = false;
      correctSoundRef.current?.unloadAsync().catch(() => {});
      wrongSoundRef.current?.unloadAsync().catch(() => {});
      correctSoundRef.current = null;
      wrongSoundRef.current = null;
    };
  }, []);

  // reset when data changes
  useEffect(() => {
    setSelected(null);
    setAttempted(false);
    setFeedbackIdx(null);
    setLastWasCorrect(null);
  }, [data]);

  const isCorrect = lastWasCorrect === true;

  const handleSelect = async (option: string) => {
    if (attempted) return;

    setSelected(option);
    setAttempted(true);

    const correct = option === data.answer;
    setLastWasCorrect(correct);

    const max = correct ? 8 : 4;
    setFeedbackIdx(Math.floor(Math.random() * max) + 1);

    try {
      if (correct) await correctSoundRef.current?.replayAsync();
      else await wrongSoundRef.current?.replayAsync();
    } catch {}

    onAttempt?.(correct);
  };

  const handleRetryInternal = () => {
    setSelected(null);
    setAttempted(false);
    setFeedbackIdx(null);
    setLastWasCorrect(null);
    onRetry?.();
  };

  const feedbackGraphic = useMemo(() => {
    if (!attempted || feedbackIdx === null || lastWasCorrect === null) return null;

    return lastWasCorrect
      ? `${AWS_URL}/graphic/c${feedbackIdx}.svg`
      : `${AWS_URL}/graphic/w${feedbackIdx}.svg`;
  }, [attempted, feedbackIdx, lastWasCorrect]);

  return (
    <View className="w-full">
      {/* MAIN CARD */}
      <View className="w-full overflow-hidden rounded-3xl border border-white/30 bg-white">
        {/* Header */}
        <View className="bg-white px-6 pb-5 pt-6">
          <MotiText
            from={{ opacity: 0, translateY: -10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 350 }}
            className="text-center font-heading1 text-2xl leading-snug text-gray-900"
          >
            {data.riddle}
          </MotiText>

          <Text className="mt-3 text-center text-sm text-gray-500">
            Pick the correct answer
          </Text>
        </View>

        {/* OPTIONS (2-column grid) */}
        <View className={`px-6 ${attempted ? "pb-2" : "pb-6"}`}>
          <View className="flex-row flex-wrap" style={{ gap: 12 }}>
            {data.options.map((option, idx) => {
              const chosen = selected === option;
              const correct = option === data.answer;

              const disabled = attempted;

              let boxClass = "bg-gray-50 border border-gray-200";
              let textClass = "text-gray-900";

              if (attempted) {
                if (chosen && correct) {
                  boxClass = "bg-green-600 border-green-700";
                  textClass = "text-white";
                } else if (chosen && !correct) {
                  boxClass = "bg-red-600 border-red-700";
                  textClass = "text-white";
                } else {
                  boxClass = "bg-gray-50 border-gray-100";
                  textClass = "text-gray-500";
                }
              }

              return (
                <MotiView
                  key={idx}
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{
                    type: "timing",
                    duration: 320,
                    delay: idx * 70,
                  }}
                  style={{ width: "48%" }}
                >
                  <Pressable
                    disabled={disabled}
                    onPress={() => handleSelect(option)}
                    className={`rounded-2xl px-4 py-4 ${boxClass}`}
                    style={({ pressed }) => ({
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                      opacity: disabled && !chosen ? 0.85 : 1,
                    })}
                  >
                    <Text className={`font-sans text-base ${textClass}`} numberOfLines={2}>
                      {option}
                    </Text>
                  </Pressable>
                </MotiView>
              );
            })}
          </View>
        </View>

        {/* RESULT */}
        <AnimatePresence>
          {attempted && (
            <MotiView
              key="result"
              from={{ opacity: 0, translateY: 18 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: 18 }}
              transition={{ type: "timing", duration: 350 }}
              className="px-6 pb-7"
            >
              {/* Cartoon */}
              {feedbackGraphic && (
                <View className="mt-1 items-center">
                  <RemoteSvg uri={feedbackGraphic} width={220} height={220} />
                </View>
              )}

              {/* Reward */}
              {isCorrect && (
                <MotiView
                  from={{ opacity: 0, scale: 0.7, translateY: 10 }}
                  animate={{ opacity: 1, scale: 1, translateY: 0 }}
                  transition={{ type: "timing", duration: 500 }}
                  className="mt-2 flex-row items-center justify-center"
                  style={{ gap: 8 }}
                >
                  <Image
                    source={require("@/assets/images/coin.png")}
                    resizeMode="contain"
                    style={{ width: 34, height: 34 }}
                  />
                  <Text className="font-heading1 text-3xl text-gray-900">+10</Text>
                </MotiView>
              )}

              {/* Fun fact */}
              <View
                className={`mt-5 rounded-2xl border px-5 py-4 ${
                  isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                }`}
              >
                <Text
                  className={`text-center font-heading1 text-lg ${
                    isCorrect ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {isCorrect ? "Correct!" : "Try again!"}
                </Text>

                <Text className="mt-2 text-center font-heading2 text-sm leading-relaxed text-gray-700">
                  {data.funFact}
                </Text>
              </View>

              {/* Buttons */}
              <View className="mt-6 flex-row gap-3">
                {/* Retry only if wrong */}
                {!isCorrect && (
                  <Pressable
                    onPress={handleRetryInternal}
                    className="flex-1 items-center rounded-2xl bg-red-500 py-4"
                    style={({ pressed }) => ({
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text className="font-heading1 text-base text-white">{retryLabel}</Text>
                  </Pressable>
                )}

                {/* Next */}
                <Pressable
                  onPress={onNext}
                  className="flex-1 items-center rounded-2xl bg-orange-500 py-4"
                  style={({ pressed }) => ({
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Text className="font-heading1 text-base text-white">{nextLabel}</Text>
                </Pressable>
              </View>

              {/* Home */}
              <Pressable
                onPress={() => router.push("/fun-break/riddles")}
                className="mt-3 items-center rounded-2xl bg-gray-800 py-4"
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text className="font-heading1 text-base text-white">{homeLabel}</Text>
              </Pressable>
            </MotiView>
          )}
        </AnimatePresence>
      </View>
    </View>
  );
}
