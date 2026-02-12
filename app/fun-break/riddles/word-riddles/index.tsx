import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';

import RiddleTemplate, { Riddle } from '@/components/fun-break/riddles/RiddleTemplate';
import { WORD_RIDDLES } from '@/data/riddles/word';

const AWS_URL = process.env.EXPO_PUBLIC_AWS_URL;

export default function WordRiddlesPage() {
  const router = useRouter();
  const total = WORD_RIDDLES.length;

  const scrollRef = useRef<ScrollView>(null);

  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [score, setScore] = useState(0);

  // which riddle indexes were already awarded points
  const [awardedSet, setAwardedSet] = useState<Set<number>>(() => new Set());

  // whether the current riddle has been attempted (used to gate Next)
  const [attempted, setAttempted] = useState(false);

  const finished = index >= total;

  const current: Riddle | null = useMemo(() => {
    if (finished) return null;
    return WORD_RIDDLES[index] as Riddle;
  }, [index, finished]);

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleNext = useCallback(() => {
    if (!attempted) return;

    setCompleted((c) => c + 1);

    const next = index + 1;
    setIndex(next);

    setAttempted(false);
    scrollToTop();
  }, [attempted, index]);

  const handleRetry = () => {
    setAttempted(false);
    scrollToTop();
  };

  const handleAttempt = (isCorrect: boolean) => {
    setAttempted(true);

    // award points only once per riddle
    if (isCorrect && !awardedSet.has(index)) {
      setScore((prev) => prev + 10);

      setAwardedSet((prev) => {
        const next = new Set(prev);
        next.add(index);
        return next;
      });
    }
  };

  const progressFraction = Math.max(0, Math.min(1, completed / total));
  const percent = total > 0 ? Math.round(progressFraction * 100) : 0;

  const coinGraphic = `${AWS_URL}/graphic/coin.png`; // use PNG in RN

  const restart = () => {
    setIndex(0);
    setCompleted(0);
    setScore(0);
    setAwardedSet(new Set());
    setAttempted(false);
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
        }}>
        {/* Header */}
        <View className="flex-col gap-4">
          <Text className="text-center font-heading1 text-4xl tracking-wide text-white">
            WORD RIDDLES
          </Text>

          {/* Score pill */}
          <View className="flex-row items-center gap-3 self-center rounded-full bg-white px-6 py-3 shadow-lg">
            <Image
              source={require('@/assets/images/coin.png')}
              resizeMode="contain"
              style={{ width: 30, height: 30 }}
            />
            <Text className="font-heading1 text-2xl text-gray-800">{score}</Text>
          </View>
        </View>

        {/* Progress */}
        <View>
          <View className="mb-2 flex-row justify-between">
            {!finished ? (
              <Text className="font-heading1 text-sm text-white/80">
                Riddle {index + 1} of {total}
              </Text>
            ) : (
              <Text className="font-heading1 text-sm text-white/80">Finished</Text>
            )}

            <Text className="font-heading1 text-sm text-white/80">{completed} Completed</Text>
          </View>

          <View className="shadow-inner h-5 w-full overflow-hidden rounded-full bg-gray-300">
            <MotiView
              from={{ width: '0%' }}
              animate={{ width: `${Math.round(progressFraction * 100)}%` }}
              transition={{ type: 'timing', duration: 450 }}
              className="h-full rounded-full bg-orange-500"
            />
          </View>

          <Text className="mt-2 text-center font-heading1 text-xs text-white/70">
            {percent}% done
          </Text>
        </View>

        {/* Riddle / Finish */}
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
          <View className="rounded-2xl border border-gray-200 bg-white p-7">
            {total > 0 && score / 10 / total >= 0.5 ? (
              <Text className="text-center font-heading1 text-4xl text-green-600">NICE WORK!</Text>
            ) : (
              <Text className="text-center font-heading1 text-4xl text-red-500">TRY AGAIN!</Text>
            )}

            <Text className="mt-4 text-center font-heading1 text-gray-700">
              You finished all riddles. You scored{' '}
              <Text className="font-heading1 text-gray-900">{score}</Text> points.
            </Text>

            <Text className="mt-6 text-center font-heading1 text-6xl text-gray-900">{score}</Text>

            <View className="mt-6 flex-row justify-center gap-4">
              <Pressable
                onPress={restart}
                className="rounded-full border border-gray-800 bg-orange-500 px-7 py-4"
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  opacity: pressed ? 0.9 : 1,
                })}>
                <Text className="font-heading1 text-base text-white">Restart</Text>
              </Pressable>

              <Pressable
                onPress={() => router.push('/fun-break/riddles')}
                className="rounded-full border border-gray-900 bg-gray-800 px-7 py-4"
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  opacity: pressed ? 0.9 : 1,
                })}>
                <Text className="font-heading1 text-base text-white">Home</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Footer tip */}
        <Text className="mt-2 text-center font-heading1 text-sm text-white/70">
          Tip: Each riddle awards points only once.
        </Text>
      </ScrollView>
    </View>
  );
}
