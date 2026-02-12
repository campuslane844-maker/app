import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Image, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';

import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  measure,
  useAnimatedRef,
} from 'react-native-reanimated';

import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { AnimatePresence, MotiText, MotiView } from 'moti';
import { RemoteSvg } from '@/components/RemoteSvg';

export type PuzzleRiddle = {
  id: number;
  riddle: string;
  options: string[];
  answer: string;
  funFact: string;
  interaction: 'puzzle';
};

const AWS_URL = process.env.EXPO_PUBLIC_AWS_URL;

type Props = {
  data: PuzzleRiddle;
  onAttempt?: (isCorrect: boolean) => void;
  onNext?: () => void;
  onRetry?: () => void;
  nextLabel?: string;
  retryLabel?: string;
  homeLabel?: string;
};

function pointInside(rect: any, x: number, y: number) {
  'worklet';
  if (!rect) return false;

  return (
    x >= rect.pageX &&
    x <= rect.pageX + rect.width &&
    y >= rect.pageY &&
    y <= rect.pageY + rect.height
  );
}

/* ======================================================
 * Draggable option chip
 * =====================================================*/

function DraggableOption({
  label,
  index,
  disabled,
  dropZoneAnimatedRef,
  onDrop,
}: {
  label: string;
  index: number;
  disabled: boolean;
  dropZoneAnimatedRef: any;
  onDrop: (opt: string, idx: number) => void;
}) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);

  const gesture = Gesture.Pan()
    .enabled(!disabled)
    .onBegin(() => {
      scale.value = withTiming(0.98, { duration: 90 });
    })
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd((e) => {
      const rect = measure(dropZoneAnimatedRef);
      const inside = pointInside(rect, e.absoluteX, e.absoluteY);

      if (inside) {
        scale.value = withTiming(1, { duration: 90 });
        tx.value = withTiming(0, { duration: 150 });
        ty.value = withTiming(0, { duration: 150 });

        runOnJS(onDrop)(label, index);
      } else {
        scale.value = withTiming(1, { duration: 90 });
        tx.value = withSpring(0, { damping: 18, stiffness: 220 });
        ty.value = withSpring(0, { damping: 18, stiffness: 220 });
      }
    })
    .onFinalize(() => {
      scale.value = withTiming(1, { duration: 90 });
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
    zIndex: 999,
    elevation: 30,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={style} className="w-[48%]">
        <View
          className={`rounded-2xl border px-5 py-4 ${
            disabled ? 'border-gray-200 bg-gray-50' : 'border-gray-300 bg-gray-50'
          }`}>
          <Text className="font-heading1 text-base text-gray-800">{label}</Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

/* ======================================================
 * Main
 * =====================================================*/

export default function PuzzleRiddleTemplate({
  data,
  onAttempt,
  onNext,
  onRetry,
  nextLabel = 'Next',
  retryLabel = 'Retry',
  homeLabel = 'Home',
}: Props) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 760;

  const [attempted, setAttempted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [dropped, setDropped] = useState<{ opt: string; idx: number } | null>(null);

  const [feedbackIdx, setFeedbackIdx] = useState<number | null>(null);
  const [soundsReady, setSoundsReady] = useState(false);

  const dropZoneAnimatedRef = useAnimatedRef<Animated.View>();

  // sounds
  const correctSoundRef = useRef<Audio.Sound | null>(null);
  const wrongSoundRef = useRef<Audio.Sound | null>(null);
  const dropSoundRef = useRef<Audio.Sound | null>(null);

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

        const drop = await Audio.Sound.createAsync(
          { uri: `${AWS_URL}/sounds/drop.mp3` },
          { shouldPlay: false, volume: 1 }
        );

        if (!mounted) {
          await correct.sound.unloadAsync();
          await wrong.sound.unloadAsync();
          await drop.sound.unloadAsync();
          return;
        }

        correctSoundRef.current = correct.sound;
        wrongSoundRef.current = wrong.sound;
        dropSoundRef.current = drop.sound;

        setSoundsReady(true);
      } catch {
        setSoundsReady(false);
      }
    })();

    return () => {
      mounted = false;
      correctSoundRef.current?.unloadAsync().catch(() => {});
      wrongSoundRef.current?.unloadAsync().catch(() => {});
      dropSoundRef.current?.unloadAsync().catch(() => {});
      correctSoundRef.current = null;
      wrongSoundRef.current = null;
      dropSoundRef.current = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      correctSoundRef.current?.unloadAsync();
      wrongSoundRef.current?.unloadAsync();
      dropSoundRef.current?.unloadAsync();
    };
  }, []);

  useEffect(() => {
    setAttempted(false);
    setIsCorrect(null);
    setDropped(null);
    setFeedbackIdx(null);
  }, [data.id]);

  const pickFeedbackIndex = (correct: boolean) =>
    correct ? Math.floor(Math.random() * 8) + 1 : Math.floor(Math.random() * 4) + 1;

  const feedbackGraphic = useMemo(() => {
    if (!attempted || feedbackIdx === null) return null;

    return isCorrect
      ? `${AWS_URL}/graphic/c${feedbackIdx}.svg`
      : `${AWS_URL}/graphic/w${feedbackIdx}.svg`;
  }, [attempted, feedbackIdx, isCorrect]);

  console.log(feedbackGraphic)

  const handleDrop = async (opt: string, idx: number) => {
    if (attempted) return;

    const correct = opt === data.answer;

    setDropped({ opt, idx });
    setIsCorrect(correct);
    setAttempted(true);
    setFeedbackIdx(pickFeedbackIndex(correct));

    onAttempt?.(correct);

    Haptics.impactAsync(
      correct ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
    );

    try {
      if (!soundsReady) return;

      await dropSoundRef.current?.replayAsync();

      setTimeout(() => {
        if (correct) correctSoundRef.current?.replayAsync().catch(() => {});
        else wrongSoundRef.current?.replayAsync().catch(() => {});
      }, 120);
    } catch {}
  };

  const handleRetryInternal = () => {
    setAttempted(false);
    setIsCorrect(null);
    setDropped(null);
    setFeedbackIdx(null);
    onRetry?.();
  };

  const handleNextInternal = () => {
    onNext?.();
  };

  return (
    <View className="mx-auto w-full rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <View className={`${isWide ? 'flex-row' : 'flex-col'} gap-6`}>
        {/* LEFT */}
        <View className="flex-1">
          <MotiText
            from={{ opacity: 0, translateY: -6 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 280 }}
            className="mb-5 font-heading1 text-xl tracking-wide text-gray-800">
            {data.riddle}
          </MotiText>

          {/* Drop Zone */}
          <Animated.View
            ref={dropZoneAnimatedRef}
            className={`mb-4 min-h-[140px] w-full items-center justify-center rounded-xl border-2 border-dashed p-4 ${
              attempted
                ? isCorrect
                  ? 'border-green-400 bg-green-50'
                  : 'border-red-400 bg-red-50'
                : 'border-gray-300 bg-gray-50'
            }`}>
            {!attempted ? (
              <Text className="font-heading1 text-base text-gray-500">Drag your answer here</Text>
            ) : (
              <MotiView
                from={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'timing', duration: 220 }}
                className="rounded-full border border-gray-200 bg-white px-5 py-3">
                <Text className={`font-heading1 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                  {dropped?.opt}
                </Text>
              </MotiView>
            )}
          </Animated.View>

          {/* Options */}
          {!attempted && (
            <View className="flex-row flex-wrap gap-3">
              {data.options.map((opt, i) => (
                <DraggableOption
                  key={`${data.id}-${i}`}
                  label={opt}
                  index={i}
                  disabled={attempted}
                  dropZoneAnimatedRef={dropZoneAnimatedRef}
                  onDrop={handleDrop}
                />
              ))}
            </View>
          )}

          {/* Fun Fact */}
          <AnimatePresence>
            {attempted && (
              <MotiView
                key="funfact"
                from={{ opacity: 0, translateY: 8 }}
                animate={{ opacity: 1, translateY: 0 }}
                exit={{ opacity: 0, translateY: 8 }}
                transition={{ type: 'timing', duration: 280 }}
                className={`mt-4 rounded-xl border p-4 ${
                  isCorrect ? 'border-green-400 bg-green-100' : 'border-red-400 bg-red-100'
                }`}>
                <Text className="mb-1 font-heading1 text-gray-900">
                  {isCorrect ? 'Correct!' : 'Try again'}
                </Text>

                <Text className="font-heading1 text-sm text-gray-800">{data.funFact}</Text>
              </MotiView>
            )}
          </AnimatePresence>
        </View>

        {/* RIGHT */}
        <View className={`${isWide ? 'w-[420px]' : 'w-full'} gap-4`}>
          {/* Buttons */}
          <View className="flex-row flex-wrap justify-center gap-3">
            <Pressable
              onPress={() => router.push('/fun-break/riddles')}
              className="rounded-full bg-gray-700 px-6 py-3"
              style={({ pressed }) => ({
                transform: [{ scale: pressed ? 0.98 : 1 }],
                opacity: pressed ? 0.85 : 1,
              })}>
              <Text className="font-heading1 text-base text-white">{homeLabel}</Text>
            </Pressable>

            {attempted && !isCorrect && (
              <Pressable
                onPress={handleRetryInternal}
                className="rounded-full bg-red-500 px-6 py-3"
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  opacity: pressed ? 0.85 : 1,
                })}>
                <Text className="font-heading1 text-base text-white">{retryLabel}</Text>
              </Pressable>
            )}

            <Pressable
              onPress={handleNextInternal}
              disabled={!attempted}
              className={`rounded-full px-6 py-3 ${
                attempted ? 'bg-orange-500' : 'bg-orange-500/60'
              }`}
              style={({ pressed }) => ({
                transform: [{ scale: pressed ? 0.98 : 1 }],
                opacity: !attempted ? 0.6 : pressed ? 0.85 : 1,
              })}>
              <Text className="font-heading1 text-base text-white">{nextLabel}</Text>
            </Pressable>
          </View>

          {/* Cartoon + coin */}
          <AnimatePresence>
            {attempted && feedbackGraphic && (
              <MotiView
                key="cartoon"
                from={{ opacity: 0, translateY: 8, scale: 0.98 }}
                animate={{ opacity: 1, translateY: 0, scale: 1 }}
                exit={{ opacity: 0, translateY: 8 }}
                transition={{ type: 'timing', duration: 320 }}
                className="mt-3 items-center">
                {/* Cartoon container */}
                <View
                  className="w-full items-center justify-center"
                  style={{
                    minHeight: 260,
                  }}>
                  {feedbackGraphic && (
                    <View className="mt-1 items-center">
                      <RemoteSvg uri={feedbackGraphic} width={220} height={220} />
                    </View>
                  )}
                </View>

                {/* Coin reward */}
                {isCorrect && (
                  <MotiView
                    from={{ opacity: 0, translateY: 14, scale: 0.85 }}
                    animate={{ opacity: 1, translateY: 0, scale: 1 }}
                    transition={{ type: 'timing', duration: 500 }}
                    className="mt-2 flex-row items-center justify-center"
                    style={{ gap: 10 }}>
                    <Image
                      source={require('@/assets/images/coin.png')}
                      resizeMode="contain"
                      style={{ width: 40, height: 40 }}
                    />

                    <Text className="font-heading1 text-3xl text-gray-900">+10</Text>
                  </MotiView>
                )}
              </MotiView>
            )}
          </AnimatePresence>
        </View>
      </View>
    </View>
  );
}
