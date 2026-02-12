import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Audio, Video, ResizeMode } from "expo-av";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export type ContentItem = {
  _id: string;
  title: string;
  description?: string;
  thumbnailKey?: string;
  s3Key?: string;
  type?: string;
  createdAt?: string;
  questions?: Question[];
  quizType?: "native" | "googleForm";
};

type Question = {
  questionText: string;
  s3Key?: string;
  options: string[];
  correctOption: number;
  funFact?: string;
};

type QuizSectionProps = {
  content: ContentItem;
  onSubmitScore: (score: number) => void;
};

const AWS_URL = process.env.EXPO_PUBLIC_AWS_STORAGE_URL || "";

// ---------------- Small UI helpers ----------------
function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${pct}%` }]} />
    </View>
  );
}

function extFromKey(s3Key?: string) {
  if (!s3Key) return null;
  const ext = s3Key.split(".").pop()?.toLowerCase();
  return ext || null;
}

function isImageExt(ext: string) {
  return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
}
function isAudioExt(ext: string) {
  return ["mp3", "wav", "ogg"].includes(ext);
}
function isVideoExt(ext: string) {
  return ["mp4", "webm", "ogg"].includes(ext);
}

// ---------------- Option button with shake/pop ----------------
function OptionButton({
  label,
  disabled,
  state,
  onPress,
}: {
  label: string;
  disabled: boolean;
  state: "idle" | "chosenCorrect" | "chosenWrong" | "otherAfterAttempt";
  onPress: () => void;
}) {
  const shakeX = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (state === "chosenWrong") {
      shakeX.value = withSequence(
        withTiming(-14, { duration: 60 }),
        withTiming(14, { duration: 60 }),
        withTiming(-10, { duration: 60 }),
        withTiming(10, { duration: 60 }),
        withTiming(-6, { duration: 60 }),
        withTiming(6, { duration: 60 }),
        withTiming(0, { duration: 60 })
      );
    }

    if (state === "chosenCorrect") {
      scale.value = withSequence(
        withTiming(1.08, { duration: 140 }),
        withTiming(1, { duration: 180 })
      );
    }
  }, [state, shakeX, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }, { scale: scale.value }],
  }));

  const baseStyle = [styles.optionBtn];

  let variantStyle = styles.optionIdle;
  if (state === "chosenCorrect") variantStyle = styles.optionCorrect;
  if (state === "chosenWrong") variantStyle = styles.optionWrong;
  if (state === "otherAfterAttempt") variantStyle = styles.optionMuted;

  return (
    <Animated.View style={animStyle}>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          ...baseStyle,
          variantStyle,
          pressed && !disabled ? { transform: [{ scale: 0.98 }] } : null,
        ]}
      >
        <Text style={styles.optionText}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ---------------- Main Component ----------------
export default function QuizSection({ content, onSubmitScore }: QuizSectionProps) {
  const questions: Question[] = content.questions || [];
  const total = questions.length;

  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const [selected, setSelected] = useState<number | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [lastWasCorrect, setLastWasCorrect] = useState<boolean | null>(null);
  const [feedbackIdx, setFeedbackIdx] = useState<number | null>(null);

  // Sounds
  const correctSound = useRef<Audio.Sound | null>(null);
  const wrongSound = useRef<Audio.Sound | null>(null);
  const nextSound = useRef<Audio.Sound | null>(null);
  const yaySound = useRef<Audio.Sound | null>(null);
  const lostSound = useRef<Audio.Sound | null>(null);
  const startSound = useRef<Audio.Sound | null>(null);

  // For question media audio (per-question s3Key)
  const questionAudio = useRef<Audio.Sound | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadUiSounds() {
      try {
        // Put these in: /assets/sounds/
        
        if (!mounted) return;

        
      } catch (e) {
        console.warn("Failed to load sounds", e);
      }
    }

    loadUiSounds();

    return () => {
      mounted = false;

      // cleanup
      correctSound.current?.unloadAsync();
      wrongSound.current?.unloadAsync();
      nextSound.current?.unloadAsync();
      yaySound.current?.unloadAsync();
      lostSound.current?.unloadAsync();
      startSound.current?.unloadAsync();
      questionAudio.current?.unloadAsync();
    };
  }, []);

  const q = questions[current];

  const pickFeedbackIndex = (isCorrect: boolean) =>
    isCorrect ? Math.floor(Math.random() * 8) + 1 : Math.floor(Math.random() * 4) + 1;

  const isCorrect = lastWasCorrect === true;

  const feedbackGraphic = useMemo(() => {
    if (feedbackIdx === null || lastWasCorrect === null) return null;
    // Put these in /assets/graphic/
    return lastWasCorrect
      ? `c${feedbackIdx}.png`
      : `w${feedbackIdx}.png`;
  }, [feedbackIdx, lastWasCorrect]);

  // ----- Stop question audio when question changes -----
  useEffect(() => {
    async function cleanupQuestionAudio() {
      try {
        if (questionAudio.current) {
          await questionAudio.current.stopAsync();
          await questionAudio.current.unloadAsync();
          questionAudio.current = null;
        }
      } catch {}
      setAudioPlaying(false);
    }

    cleanupQuestionAudio();
  }, [current]);

  const playSound = async (s?: Audio.Sound | null) => {
    try {
      if (!s) return;
      await s.replayAsync();
    } catch {}
  };

  const handleSelect = async (idx: number) => {
    if (attempted) return;
    const correct = idx === q.correctOption;

    setSelected(idx);
    setAttempted(true);
    setLastWasCorrect(correct);
    setFeedbackIdx(pickFeedbackIndex(correct));

    if (correct) {
      setScore((s) => s + 1);
      await playSound(correctSound.current);
    } else {
      await playSound(wrongSound.current);
    }
  };

  const handleNext = async () => {
    await playSound(nextSound.current);

    if (current + 1 < total) {
      setCurrent((c) => c + 1);
      setSelected(null);
      setAttempted(false);
      setLastWasCorrect(null);
      setFeedbackIdx(null);
    } else {
      setFinished(true);

      const finalScore = Math.round((score / total) * 100);
      if (finalScore >= 50) await playSound(yaySound.current);
      else await playSound(lostSound.current);

      onSubmitScore(finalScore);
    }
  };

  const handleRetry = () => {
    setSelected(null);
    setAttempted(false);
    setLastWasCorrect(null);
    setFeedbackIdx(null);
  };

  const handleRestart = () => {
    setStarted(false);
    setFinished(false);
    setScore(0);
    setCurrent(0);
    setSelected(null);
    setAttempted(false);
    setLastWasCorrect(null);
    setFeedbackIdx(null);
  };

  // ---------------- Media renderer (RN) ----------------
  const renderMedia = () => {
    if (!q?.s3Key) return null;

    const url = `${AWS_URL}/${q.s3Key}`;
    const ext = extFromKey(q.s3Key);
    if (!ext) return null;

    if (isImageExt(ext)) {
      return (
        <Image
          source={{ uri: url }}
          style={styles.qImage}
          resizeMode="contain"
        />
      );
    }

    if (isVideoExt(ext)) {
      return (
        <View style={styles.videoWrap}>
          <Video
            style={styles.qVideo}
            source={{ uri: url }}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
          />
        </View>
      );
    }

    if (isAudioExt(ext)) {
      return (
        <View style={styles.audioCard}>
          <Text style={styles.audioTitle}>Audio</Text>

          <Pressable
            style={[styles.audioBtn, audioPlaying ? styles.audioBtnStop : null]}
            onPress={async () => {
              try {
                if (audioLoading) return;

                // stop if playing
                if (audioPlaying && questionAudio.current) {
                  await questionAudio.current.stopAsync();
                  setAudioPlaying(false);
                  return;
                }

                setAudioLoading(true);

                // lazy-load
                if (!questionAudio.current) {
                  const res = await Audio.Sound.createAsync(
                    { uri: url },
                    { shouldPlay: true }
                  );
                  questionAudio.current = res.sound;

                  questionAudio.current.setOnPlaybackStatusUpdate((st) => {
                    if (!st.isLoaded) return;
                    if (st.didJustFinish) setAudioPlaying(false);
                  });
                }

                await questionAudio.current.replayAsync();
                setAudioPlaying(true);
              } catch (e) {
                console.warn("Audio play failed", e);
              } finally {
                setAudioLoading(false);
              }
            }}
          >
            {audioLoading ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.audioBtnText}>
                {audioPlaying ? "Stop Audio" : "Play Audio"}
              </Text>
            )}
          </Pressable>
        </View>
      );
    }

    return null;
  };

  // ---------------- Finished screen ----------------
  if (finished) {
    const percentage = Math.round((score / total) * 100);
    const passed = percentage >= 50;

    return (
      <View style={styles.finishCard}>
        <Text style={[styles.finishTitle, passed ? styles.good : styles.bad]}>
          {passed ? "🎉 Yay! Great job!" : "😅 Better luck next time!"}
        </Text>

        <View style={[styles.scoreCircle, passed ? styles.circleGood : styles.circleBad]}>
          <Text style={[styles.scoreCircleText, passed ? styles.good : styles.bad]}>
            {percentage}%
          </Text>
        </View>

        <Text style={styles.finishSub}>
          You scored <Text style={styles.bold}>{score}</Text> out of {total}
        </Text>

        <Pressable style={styles.primaryBtn} onPress={handleRestart}>
          <Text style={styles.primaryBtnText}>Restart Quiz</Text>
        </Pressable>
      </View>
    );
  }

  // ---------------- Intro screen ----------------
  if (!started) {
    return (
      <View style={styles.introCard}>
        <Text style={styles.introTitle}>Ready to Play?</Text>

        <Text style={styles.introSub}>
          This quiz has <Text style={styles.bold}>{total}</Text> questions.
        </Text>

        <Pressable
          style={styles.primaryBtn}
          onPress={async () => {
            setStarted(true);
            await playSound(startSound.current);
          }}
        >
          <Text style={styles.primaryBtnText}>Start Quiz ▶</Text>
        </Pressable>
      </View>
    );
  }

  // ---------------- Question screen ----------------
  return (
    <ScrollView contentContainerStyle={styles.quizWrap}>
      <View style={styles.topBar}>
        <ProgressBar value={((current + 1) / total) * 100} />
        <Text style={styles.qCount}>
          Question {current + 1} of {total}
        </Text>
      </View>

      <View style={styles.mainGrid}>
        {/* LEFT */}
        <View style={styles.left}>
          <Text style={styles.question}>{q.questionText}</Text>

          {renderMedia()}

          <View style={styles.optionsGrid}>
            {q.options.map((opt, i) => {
              const chosen = selected === i;
              const correct = i === q.correctOption;

              let state: "idle" | "chosenCorrect" | "chosenWrong" | "otherAfterAttempt" = "idle";

              if (attempted) {
                if (chosen && correct) state = "chosenCorrect";
                else if (chosen && !correct) state = "chosenWrong";
                else state = "otherAfterAttempt";
              }

              return (
                <OptionButton
                  key={`${current}-${i}`}
                  label={opt}
                  disabled={attempted}
                  state={state}
                  onPress={() => handleSelect(i)}
                />
              );
            })}
          </View>

          {/* Fun fact */}
          {attempted && !!q.funFact && (
            <View style={[styles.funFact, isCorrect ? styles.funGood : styles.funBad]}>
              <Text style={styles.funTitle}>{isCorrect ? "Correct!" : "Try again"}</Text>
              <Text style={styles.funText}>{q.funFact}</Text>
            </View>
          )}
        </View>

        {/* RIGHT */}
        <View style={styles.right}>
          <View style={styles.btnRow}>
            <Pressable
              onPress={() => router.push("/(tabs)/home")}
              style={[styles.poppyBtn, styles.poppyDark]}
            >
              <Text style={styles.poppyBtnText}>Home</Text>
            </Pressable>

            {attempted && !isCorrect && (
              <Pressable
                onPress={handleRetry}
                style={[styles.poppyBtn, styles.poppyRed]}
              >
                <Text style={styles.poppyBtnText}>Retry</Text>
              </Pressable>
            )}

            <Pressable
              onPress={handleNext}
              disabled={!attempted}
              style={[
                styles.poppyBtn,
                !attempted ? styles.poppyDisabled : null,
              ]}
            >
              <Text style={styles.poppyBtnText}>Next</Text>
            </Pressable>
          </View>

          {/* Feedback graphic + coin */}
          {attempted && feedbackGraphic && (
            <View style={styles.feedbackWrap}>
              <View style={styles.feedbackBox}>
                {/* Put these images in /assets/graphic/ as PNG.
                    RN does NOT support remote SVG without extra libs. */}
                
              </View>

              {isCorrect && (
                <View style={styles.coinRow}>
                  <Text style={styles.coinText}>🪙 +10</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  quizWrap: {
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  topBar: { gap: 8, marginBottom: 14 },
  qCount: { fontSize: 12, color: "#64748b", fontWeight: "700" },

  progressTrack: {
    height: 10,
    borderRadius: 99,
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
  },
  progressFill: { height: 10, backgroundColor: "#0f172a" },

  mainGrid: { gap: 18 },
  left: { gap: 14 },
  right: { gap: 14 },

  question: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1f2937",
    lineHeight: 26,
  },

  qImage: {
    width: "100%",
    height: 260,
    borderRadius: 16,
    backgroundColor: "#f8fafc",
  },

  videoWrap: {
    width: "100%",
    height: 260,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  qVideo: { width: "100%", height: "100%" },

  audioCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#f8fafc",
    gap: 10,
  },
  audioTitle: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  audioBtn: {
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#0f172a",
    alignItems: "center",
  },
  audioBtnStop: { backgroundColor: "#b91c1c" },
  audioBtnText: { color: "#fff", fontWeight: "900" },

  optionsGrid: { gap: 12 },

  optionBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
  },
  optionIdle: { backgroundColor: "#f9fafb", borderColor: "#d1d5db" },
  optionCorrect: { backgroundColor: "#16a34a", borderColor: "#15803d" },
  optionWrong: { backgroundColor: "#dc2626", borderColor: "#b91c1c" },
  optionMuted: { backgroundColor: "#f9fafb", borderColor: "#e5e7eb" },
  optionText: { fontSize: 16, fontWeight: "800", color: "#111827" },

  funFact: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  funGood: { backgroundColor: "#dcfce7", borderColor: "#4ade80" },
  funBad: { backgroundColor: "#fee2e2", borderColor: "#f87171" },
  funTitle: { fontSize: 14, fontWeight: "900", color: "#111827" },
  funText: { fontSize: 13, color: "#1f2937", lineHeight: 18 },

  btnRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  poppyBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#111827",
    backgroundColor: "#f97316",
  },
  poppyDark: { backgroundColor: "#374151" },
  poppyRed: { backgroundColor: "#ef4444" },
  poppyDisabled: { opacity: 0.55 },
  poppyBtnText: { color: "#fff", fontSize: 16, fontWeight: "900" },

  feedbackWrap: { gap: 10 },
  feedbackBox: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackImg: { width: 200, height: 200 },

  coinRow: { alignItems: "flex-end" },
  coinText: { fontSize: 26, fontWeight: "900", color: "#111827" },

  introCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 18,
    alignItems: "center",
    gap: 10,
  },
  introTitle: { fontSize: 22, fontWeight: "900", color: "#0f172a" },
  introSub: { fontSize: 14, color: "#64748b", textAlign: "center" },

  finishCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 20,
    alignItems: "center",
    gap: 14,
  },
  finishTitle: { fontSize: 22, fontWeight: "900", textAlign: "center" },
  finishSub: { fontSize: 15, color: "#334155" },

  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  circleGood: { backgroundColor: "#dcfce7" },
  circleBad: { backgroundColor: "#fee2e2" },
  scoreCircleText: { fontSize: 28, fontWeight: "900" },

  good: { color: "#059669" },
  bad: { color: "#e11d48" },

  primaryBtn: {
    backgroundColor: "#0f172a",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    marginTop: 6,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "900" },

  bold: { fontWeight: "900", color: "#0f172a" },
});
