import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";

import { Audio } from "expo-av";
import { AnimatePresence, MotiView } from "moti";

const AWS_URL = process.env.EXPO_PUBLIC_AWS_STORAGE_URL;

const OPTIONS = ["15", "18", "20", "25"];
const CORRECT = "20";

type Props = {
  onScore?: (points: number) => void;
  onNext?: () => void;
  nextLabel?: string;
  retryLabel?: string;
  homeLabel?: string;
};

export default function CatLegsGameScreen({
  onScore,
  onNext,
  nextLabel = "Next",
  retryLabel = "Retry",
  homeLabel = "Home",
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [feedbackIdx, setFeedbackIdx] = useState<number | null>(null);

  // sounds
  const correctSound = useRef<Audio.Sound | null>(null);
  const wrongSound = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    const loadSounds = async () => {
      correctSound.current = new Audio.Sound();
      wrongSound.current = new Audio.Sound();

      await correctSound.current.loadAsync({
        uri: `${AWS_URL}/sounds/correct.mp3`,
      });

      await wrongSound.current.loadAsync({
        uri: `${AWS_URL}/sounds/wrong.mp3`,
      });
    };

    loadSounds();

    return () => {
      correctSound.current?.unloadAsync();
      wrongSound.current?.unloadAsync();
    };
  }, []);

  const handleSelect = async (opt: string) => {
    if (attempted) return;

    setSelected(opt);
    setAttempted(true);

    const correct = opt === CORRECT;
    setIsCorrect(correct);

    const idxPick = correct
      ? Math.floor(Math.random() * 8) + 1
      : Math.floor(Math.random() * 4) + 1;

    setFeedbackIdx(idxPick);

    if (correct) {
      await correctSound.current?.playAsync();
      onScore?.(10);
    } else {
      await wrongSound.current?.playAsync();
    }
  };

  const handleRetry = () => {
    setSelected(null);
    setAttempted(false);
    setIsCorrect(null);
    setFeedbackIdx(null);
  };

  const feedbackGraphic = useMemo(() => {
    if (feedbackIdx === null || isCorrect === null) return null;

    return isCorrect
      ? `${AWS_URL}/graphic/c${feedbackIdx}.png`
      : `${AWS_URL}/graphic/w${feedbackIdx}.png`;
  }, [feedbackIdx, isCorrect]);

  return (
    <View className="w-full bg-white rounded-2xl border border-gray-200 p-6">
      {/* Question */}
      <Text className="font-heading1 text-xl text-gray-800 mb-6">
        Three cats have 12 legs. How many legs do 5 cats have?
      </Text>

      {/* Cats Image */}
      <View className="w-full mb-6 rounded-xl overflow-hidden">
        <Image
          source={{ uri: `${AWS_URL}/graphic/cats.png` }}
          className="w-full h-52"
          resizeMode="contain"
        />
      </View>

      {/* Options */}
      <View className="flex-row flex-wrap justify-between gap-y-4">
        {OPTIONS.map((opt) => {
          const chosen = selected === opt;
          const correct = opt === CORRECT;

          let box =
            "bg-gray-50 border border-gray-300 text-gray-800";

          if (attempted) {
            if (chosen && correct)
              box = "bg-green-600 border border-green-700";
            else if (chosen && !correct)
              box = "bg-red-600 border border-red-700";
            else box = "bg-gray-50 border border-gray-200 opacity-60";
          }

          return (
            <TouchableOpacity
              key={opt}
              disabled={attempted}
              onPress={() => handleSelect(opt)}
              className={`w-[48%] rounded-xl p-4 items-center ${box}`}
            >
              <Text className="font-heading1 text-lg text-white">
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Feedback */}
      <AnimatePresence>
        {attempted && (
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0 }}
            className={`mt-5 p-4 rounded-xl border ${
              isCorrect
                ? "bg-green-100 border-green-400"
                : "bg-red-100 border-red-400"
            }`}
          >
            <Text className="font-heading1 text-lg mb-1 text-gray-900">
              {isCorrect ? "Correct!" : "Try again"}
            </Text>

            <Text className="font-heading1 text-sm text-gray-700">
              Each cat has 4 legs. 5 × 4 = 20 legs.
            </Text>
          </MotiView>
        )}
      </AnimatePresence>

      {/* Buttons */}
      <View className="flex-row flex-wrap justify-center gap-3 mt-6">
        <TouchableOpacity className="bg-gray-700 px-6 py-3 rounded-full">
          <Text className="font-heading1 text-white text-base">
            {homeLabel}
          </Text>
        </TouchableOpacity>

        {attempted && !isCorrect && (
          <TouchableOpacity
            onPress={handleRetry}
            className="bg-red-500 px-6 py-3 rounded-full"
          >
            <Text className="font-heading1 text-white text-base">
              {retryLabel}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          disabled={!attempted}
          onPress={() => onNext?.()}
          className={`bg-orange-500 px-6 py-3 rounded-full ${
            !attempted ? "opacity-50" : ""
          }`}
        >
          <Text className="font-heading1 text-white text-base">
            {nextLabel}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Cartoon Feedback */}
      <AnimatePresence>
        {attempted && feedbackGraphic && (
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="mt-8 items-center"
          >
            <Image
              source={{ uri: feedbackGraphic }}
              className="w-52 h-52"
              resizeMode="contain"
            />

            {isCorrect && (
              <Text className="font-heading1 text-3xl mt-2 text-gray-800">
                +10
              </Text>
            )}
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
}
