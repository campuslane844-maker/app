import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';

import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useIsFocused } from '@react-navigation/native';
import { AnimatePresence, MotiText, MotiView } from 'moti';
import { useFocusEffect } from '@react-navigation/native';

const AWS_URL = process.env.EXPO_PUBLIC_AWS_URL;

export type TongueTwister = {
  id: number;
  text: string;
  stars: number;
  challenge: string;
  normal: string;
  slow: string;
};

type Props = {
  data: TongueTwister;
  onNext?: () => void;
  onBack?: () => void;
  nextLabel?: string;
  backLabel?: string;
  homeLabel?: string;
};

function clampStars(n: number) {
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(3, Math.floor(n)));
}

export default function TongueTwisterTemplate({
  data,
  onNext,
  onBack,
  nextLabel = 'Next',
  backLabel = 'Back',
  homeLabel = 'Home',
}: Props) {
  const router = useRouter();

  const stars = clampStars(data.stars);

  // ======================================================
  // Playback
  // ======================================================

  const normalSoundRef = useRef<Audio.Sound | null>(null);
  const slowSoundRef = useRef<Audio.Sound | null>(null);

  const [soundsReady, setSoundsReady] = useState(false);

  const isFocused = useIsFocused();
  const [recordError, setRecordError] = useState<string | null>(null);

  const stopPlayback = async () => {
    try {
      await normalSoundRef.current?.stopAsync();
    } catch {}
    try {
      await slowSoundRef.current?.stopAsync();
    } catch {}
  };

  const unloadPlayback = async () => {
    try {
      await normalSoundRef.current?.unloadAsync();
    } catch {}
    try {
      await slowSoundRef.current?.unloadAsync();
    } catch {}
    normalSoundRef.current = null;
    slowSoundRef.current = null;
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setSoundsReady(false);

        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false, // IMPORTANT: default to playback mode
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        const normal = await Audio.Sound.createAsync(
          { uri: `${AWS_URL}${data.normal}` },
          { shouldPlay: false, volume: 1 }
        );

        const slow = await Audio.Sound.createAsync(
          { uri: `${AWS_URL}${data.slow}` },
          { shouldPlay: false, volume: 1 }
        );

        if (!mounted) {
          await normal.sound.unloadAsync();
          await slow.sound.unloadAsync();
          return;
        }

        normalSoundRef.current = normal.sound;
        slowSoundRef.current = slow.sound;

        setSoundsReady(true);
      } catch {
        setSoundsReady(false);
      }
    })();

    return () => {
      mounted = false;
      stopPlayback();
      unloadPlayback();
    };
  }, [data.id]);

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        stopPlayback();
      };
    }, [])
  );

  const handlePlayNormal = async () => {
    try {
      if (!soundsReady) return;
      await stopPlayback();
      await normalSoundRef.current?.replayAsync();
      Haptics.selectionAsync();
    } catch {}
  };

  const handlePlaySlow = async () => {
    try {
      if (!soundsReady) return;
      await stopPlayback();
      await slowSoundRef.current?.replayAsync();
      Haptics.selectionAsync();
    } catch {}
  };

  // ======================================================
  // Recording (FIXED)
  // ======================================================

  const recordingRef = useRef<Audio.Recording | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);

  const stopRecordingSafe = async () => {
    try {
      const rec = recordingRef.current;
      if (!rec) return;

      recordingRef.current = null;

      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();

      setRecording(false);
      setRecordedUri(uri ?? null);

      // IMPORTANT: go back to playback mode after recording
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    } catch {
      setRecording(false);
    }
  };

  const startRecording = async () => {
    try {
      setRecordError(null);

      if (!isFocused) return;

      await stopPlayback();
      setRecordedUri(null);

      const perm = await Audio.requestPermissionsAsync();

      if (!isFocused) return;

      if (!perm.granted) {
        setRecordError('Microphone permission denied.');
        return;
      }

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      if (!isFocused) return;

      const rec = new Audio.Recording();
      recordingRef.current = rec;

      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);

      if (!isFocused) return;

      await rec.startAsync();

      if (!isFocused) {
        // if screen changed mid-start, stop safely
        await stopRecordingSafe();
        return;
      }

      setRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      setRecording(false);

      // NO ALERT (Android crash)
      console.log(
        'Recording failed. If you are using Expo Go, recording may not work. Use a Dev Build.'
      );
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        stopRecordingSafe();
      };
    }, [])
  );

  useEffect(() => {
    setRecording(false);
    setRecordedUri(null);
  }, [data.id]);

  // ======================================================
  // Recorded playback
  // ======================================================

  const recordedSoundRef = useRef<Audio.Sound | null>(null);

  const stopRecordedPlayback = async () => {
    try {
      await recordedSoundRef.current?.stopAsync();
    } catch {}
  };

  const unloadRecordedPlayback = async () => {
    try {
      await recordedSoundRef.current?.unloadAsync();
    } catch {}
    recordedSoundRef.current = null;
  };

  useEffect(() => {
    return () => {
      stopRecordedPlayback();
      unloadRecordedPlayback();
    };
  }, []);

  const handlePlayRecording = async () => {
    try {
      if (!recordedUri) return;

      await stopPlayback();
      await stopRecordedPlayback();
      await unloadRecordedPlayback();

      const { sound } = await Audio.Sound.createAsync(
        { uri: recordedUri },
        { shouldPlay: true, volume: 1 }
      );

      recordedSoundRef.current = sound;
      Haptics.selectionAsync();
    } catch {}
  };

  // ======================================================
  // UI helpers
  // ======================================================

  const starsText = useMemo(() => {
    const full = '★'.repeat(stars);
    const empty = '☆'.repeat(3 - stars);
    return full + empty;
  }, [stars]);

  return (
    <View className="w-full overflow-hidden rounded-3xl border border-gray-200 bg-white p-5">
      <View className="mb-4 gap-2">
        <Text className="font-heading1 text-3xl text-yellow-400">{starsText}</Text>
        <Text className="font-heading1 text-sm text-gray-600">{data.challenge}</Text>
      </View>

      <MotiText
        from={{ opacity: 0, translateY: -6 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 280 }}
        className="font-heading1 text-xl leading-snug text-gray-800">
        {data.text}
      </MotiText>

      <View className="mt-6 gap-5">
        <View className="flex-row flex-wrap justify-center gap-3">
          <Pressable
            onPress={handlePlayNormal}
            className="rounded-full bg-green-600 px-6 py-4"
            style={({ pressed }) => ({
              transform: [{ scale: pressed ? 0.98 : 1 }],
              opacity: pressed ? 0.88 : 1,
            })}>
            <Text className="font-heading1 text-base text-white">Normal</Text>
          </Pressable>

          <Pressable
            onPress={handlePlaySlow}
            className="rounded-full bg-red-500 px-6 py-4"
            style={({ pressed }) => ({
              transform: [{ scale: pressed ? 0.98 : 1 }],
              opacity: pressed ? 0.88 : 1,
            })}>
            <Text className="font-heading1 text-base text-white">Slow</Text>
          </Pressable>

          {!recording ? (
            <Pressable
              onPress={startRecording}
              className="rounded-full bg-blue-600 px-6 py-4"
              style={({ pressed }) => ({
                transform: [{ scale: pressed ? 0.98 : 1 }],
                opacity: pressed ? 0.88 : 1,
              })}>
              <Text className="font-heading1 text-base text-white">Record</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={stopRecordingSafe}
              className="rounded-full bg-red-600 px-6 py-4"
              style={({ pressed }) => ({
                transform: [{ scale: pressed ? 0.98 : 1 }],
                opacity: pressed ? 0.88 : 1,
              })}>
              <Text className="font-heading1 text-base text-white">Stop</Text>
            </Pressable>
          )}
        </View>

        <AnimatePresence>
          {!!recordedUri && !recording && (
            <MotiView
              key="recorded"
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: 10 }}
              transition={{ type: 'timing', duration: 260 }}
              className="items-center">
              <Pressable
                onPress={handlePlayRecording}
                className="rounded-full bg-gray-900 px-7 py-4"
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  opacity: pressed ? 0.88 : 1,
                })}>
                <Text className="font-heading1 text-base text-white">Play My Recording</Text>
              </Pressable>
            </MotiView>
          )}
        </AnimatePresence>

        <View className="flex-row flex-wrap justify-center gap-3">
          <Pressable
            onPress={async () => {
              await stopPlayback();
              await stopRecordedPlayback();
              router.push('/fun-break');
            }}
            className="rounded-full bg-gray-800 px-7 py-4"
            style={({ pressed }) => ({
              transform: [{ scale: pressed ? 0.98 : 1 }],
              opacity: pressed ? 0.88 : 1,
            })}>
            <Text className="font-heading1 text-base text-white">Home</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
