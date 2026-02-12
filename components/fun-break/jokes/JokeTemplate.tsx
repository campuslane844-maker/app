import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

import { Audio, Video, ResizeMode } from 'expo-av';
import { AnimatePresence, MotiView, MotiText } from 'moti';
import { useFocusEffect } from '@react-navigation/native';

const AWS_URL = process.env.EXPO_PUBLIC_AWS_URL;

export type Joke = {
  id: string;
  content: string;
  explanation: string;
  developerInstruction: string;
  video: string;
};

type Props = {
  data: Joke;
  onNext?: () => void;
  nextLabel?: string;
  homeLabel?: string;
};

export default function JokeTemplate({
  data,
  onNext,
  nextLabel = 'Next Joke',
  homeLabel = 'Home',
}: Props) {
  const router = useRouter();

  const [revealed, setRevealed] = useState(false);

  // sound
  const laughSoundRef = useRef<Audio.Sound | null>(null);
  const [soundReady, setSoundReady] = useState(false);

  const videoRef = useRef<Video>(null);

  const stopAllMedia = async () => {
    try {
      await videoRef.current?.stopAsync();
    } catch {}

    try {
      await laughSoundRef.current?.stopAsync();
    } catch {}
  };

  useEffect(() => {
  (async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,   
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch {}
  })();
}, []);


  useFocusEffect(
    React.useCallback(() => {
      // screen focused: do nothing
      return () => {
        // screen unfocused: stop everything
        stopAllMedia();
      };
    }, [])
  );

  // parse content safely
  const { question, punchline } = useMemo(() => {
    const parts = data.content.split('?');
    const q = parts[0]?.trim();
    const p = parts.slice(1).join('?').trim();
    return {
      question: q ? q + '?' : data.content,
      punchline: p || '',
    };
  }, [data.content]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const laugh = await Audio.Sound.createAsync(
          { uri: `${AWS_URL}/sounds/laugh.mp3` },
          { shouldPlay: false, volume: 1 }
        );

        if (!mounted) {
          await laugh.sound.unloadAsync();
          return;
        }

        laughSoundRef.current = laugh.sound;
        setSoundReady(true);
      } catch {
        setSoundReady(false);
      }
    })();

    return () => {
      mounted = false;
      laughSoundRef.current?.unloadAsync().catch(() => {});
      laughSoundRef.current = null;
    };
  }, []);

  // reset when new joke arrives
  useEffect(() => {
    setRevealed(false);
  }, [data.id]);

  const handleReveal = async () => {
    setRevealed(true);

    try {
      if (!soundReady) return;
      await laughSoundRef.current?.replayAsync();
    } catch {}
  };

  const handleNextInternal = () => {
    setRevealed(false);
    onNext?.();
  };

  return (
    <View className="w-full overflow-hidden rounded-3xl border border-gray-200 bg-white">
      {/* TOP: Joke content */}
      <View className="px-6 pb-5 pt-6">
        <MotiText
          from={{ opacity: 0, translateY: -8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 280 }}
          className="text-center font-heading1 text-2xl text-gray-900">
          {question}
        </MotiText>

        <Text className="mt-3 text-center font-heading1 text-sm text-gray-500">
          Tap reveal to see the punchline
        </Text>

        {/* Buttons BEFORE reveal */}
        {!revealed && (
          <View className="mt-6 flex-row flex-wrap justify-center gap-3">
            <Pressable
              onPress={handleReveal}
              className="rounded-full bg-blue-600 px-6 py-4"
              style={({ pressed }) => ({
                transform: [{ scale: pressed ? 0.98 : 1 }],
                opacity: pressed ? 0.88 : 1,
              })}>
              <Text className="font-heading1 text-base text-white">Reveal Punchline</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/fun-break')}
              className="rounded-full bg-gray-800 px-6 py-4"
              style={({ pressed }) => ({
                transform: [{ scale: pressed ? 0.98 : 1 }],
                opacity: pressed ? 0.88 : 1,
              })}>
              <Text className="font-heading1 text-base text-white">{homeLabel}</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* REVEALED BLOCK */}
      <AnimatePresence>
        {revealed && (
          <MotiView
            key="revealed"
            from={{ opacity: 0, translateY: 14 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: 14 }}
            transition={{ type: 'timing', duration: 320 }}
            className="px-6 pb-7">
            {/* Punchline + explanation */}
            <View className="rounded-2xl border border-green-300 bg-green-50 px-5 py-4">
              <Text className="text-center font-heading1 text-lg text-gray-900">Punchline</Text>

              <Text className="mt-2 text-center font-heading1 text-base text-gray-800">
                {punchline || '😅'}
              </Text>

              <Text className="mt-4 font-heading1 text-sm leading-relaxed text-gray-700">
                <Text className="font-heading1 text-gray-900">Why it’s funny: </Text>
                {data.explanation}
              </Text>
            </View>

            {/* Video */}
            <MotiView
              from={{ opacity: 0, translateY: 10, scale: 0.98 }}
              animate={{ opacity: 1, translateY: 0, scale: 1 }}
              transition={{ type: 'timing', duration: 320 }}
              className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-black">
              <Video
                ref={videoRef}
                source={{ uri: `${AWS_URL}${data.video}` }}
                style={{ width: '100%', height: 210 }}
                resizeMode={ResizeMode.COVER}
                shouldPlay
                isLooping
                useNativeControls={false}
                volume={1}
              />
            </MotiView>

            {/* Buttons AFTER reveal */}
            <View className="mt-6 flex-row flex-wrap justify-center gap-3">
              <Pressable
                onPress={async () => {
                  await stopAllMedia();
                  router.push('/fun-break');
                }}
                className="rounded-full bg-gray-800 px-6 py-4"
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  opacity: pressed ? 0.88 : 1,
                })}>
                <Text className="font-heading1 text-base text-white">{homeLabel}</Text>
              </Pressable>

              <Pressable
                onPress={handleNextInternal}
                className="rounded-full bg-orange-500 px-6 py-4"
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  opacity: pressed ? 0.88 : 1,
                })}>
                <Text className="font-heading1 text-base text-white">{nextLabel}</Text>
              </Pressable>
            </View>
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
}
