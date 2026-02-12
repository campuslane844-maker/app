import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Audio } from "expo-av";

import Animated, {
  FadeInDown,
  FadeOutDown,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { Gesture, GestureDetector } from "react-native-gesture-handler";

const AWS_URL = process.env.EXPO_PUBLIC_AWS_STORAGE_URL;

const CORRECT_ORDER = ["5", "10", "15", "20", "25"];
const INITIAL_ITEMS = ["15", "5", "25", "10", "20"];

type Props = {
  onScore?: (points: number) => void;
  onNext: () => void;
  nextLabel?: string;
  retryLabel?: string;
  homeLabel?: string;
};

const { width: SCREEN_W } = Dimensions.get("window");

function sameArray(a: string[], b: string[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function clamp(n: number, min: number, max: number) {
  "worklet";
  return Math.max(min, Math.min(max, n));
}

function arrayMove<T>(arr: T[], from: number, to: number) {
  const copy = [...arr];
  const item = copy.splice(from, 1)[0];
  copy.splice(to, 0, item);
  return copy;
}

/**
 * Horizontal reorder row:
 * - drag a card left/right
 * - when it crosses a "slot", it reorders state
 *
 * NOTE:
 * This is a good lightweight solution for 5 items.
 * If you want a perfect iOS-level reorder, we can do it with absolute positioning.
 */
function DraggableRow({
  items,
  setItems,
  submitted,
  isCorrect,
}: {
  items: string[];
  setItems: (v: string[]) => void;
  submitted: boolean;
  isCorrect: boolean | null;
}) {
  return (
    <View style={styles.rowWrap}>
      {items.map((num, index) => (
        <DraggableCard
          key={`${num}-${index}`}
          value={num}
          index={index}
          items={items}
          setItems={setItems}
          submitted={submitted}
          isCorrect={isCorrect}
        />
      ))}
    </View>
  );
}

function DraggableCard({
  value,
  index,
  items,
  setItems,
  submitted,
  isCorrect,
}: {
  value: string;
  index: number;
  items: string[];
  setItems: (v: string[]) => void;
  submitted: boolean;
  isCorrect: boolean | null;
}) {
  const x = useSharedValue(0);
  const dragging = useSharedValue(false);

  // These numbers control the reorder logic.
  // Keep them consistent with the card style.
  const CARD_W = 84;
  const GAP = 12;

  const gesture = Gesture.Pan()
    .enabled(!submitted)
    .onBegin(() => {
      dragging.value = true;
    })
    .onChange((e) => {
      x.value = e.translationX;

      const shift = Math.round(x.value / (CARD_W + GAP));
      const nextIndex = clamp(index + shift, 0, items.length - 1);

      if (nextIndex !== index) {
        // reorder in JS state
        setItems(arrayMove(items, index, nextIndex));
        x.value = 0;
      }
    })
    .onFinalize(() => {
      dragging.value = false;
      x.value = withSpring(0, { damping: 18, stiffness: 220 });
    });

  const animStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: x.value },
        { scale: withSpring(dragging.value ? 1.08 : 1) },
      ],
      zIndex: dragging.value ? 50 : 1,
    };
  });

  const cardStyle = useMemo(() => {
    if (!submitted) return styles.cardDefault;
    if (isCorrect) return styles.cardCorrect;
    return styles.cardWrong;
  }, [submitted, isCorrect]);

  const textStyle = useMemo(() => {
    if (!submitted) return styles.cardTextDefault;
    if (isCorrect) return styles.cardTextCorrect;
    return styles.cardTextWrong;
  }, [submitted, isCorrect]);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        layout={Layout.springify()}
        style={[styles.cardBase, cardStyle, animStyle]}
      >
        <Text style={[styles.headingText, styles.cardTextBase, textStyle]}>
          {value}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

export default function ArrangeNumbersGame({
  onScore,
  onNext,
  nextLabel = "Next",
  retryLabel = "Retry",
  homeLabel = "Home",
}: Props) {
  const router = useRouter();

  const [items, setItems] = useState<string[]>(INITIAL_ITEMS);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [feedbackIdx, setFeedbackIdx] = useState<number | null>(null);

  // expo-av sounds
  const correctSoundRef = useRef<Audio.Sound | null>(null);
  const wrongSoundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadSounds() {
      if (!AWS_URL) return;

      try {
        const correct = new Audio.Sound();
        const wrong = new Audio.Sound();

        await correct.loadAsync({ uri: `${AWS_URL}/sounds/correct.mp3` });
        await wrong.loadAsync({ uri: `${AWS_URL}/sounds/wrong.mp3` });

        if (!mounted) return;

        correctSoundRef.current = correct;
        wrongSoundRef.current = wrong;
      } catch {
        // ignore
      }
    }

    loadSounds();

    return () => {
      mounted = false;
      correctSoundRef.current?.unloadAsync().catch(() => {});
      wrongSoundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const handleSubmit = async () => {
    if (submitted) return;

    const correct = sameArray(items, CORRECT_ORDER);

    setIsCorrect(correct);
    setSubmitted(true);

    const idxPick = correct
      ? Math.floor(Math.random() * 8) + 1
      : Math.floor(Math.random() * 4) + 1;

    setFeedbackIdx(idxPick);

    try {
      if (correct) {
        await correctSoundRef.current?.replayAsync();
        onScore?.(10);
      } else {
        await wrongSoundRef.current?.replayAsync();
      }
    } catch {
      // ignore
    }
  };

  const handleRetry = () => {
    setItems(INITIAL_ITEMS);
    setSubmitted(false);
    setIsCorrect(null);
    setFeedbackIdx(null);
  };

  /**
   * IMPORTANT:
   * React Native <Image /> cannot render SVG.
   *
   * So:
   * - Either store these as PNG in S3
   * - Or use react-native-svg
   *
   * For now, we assume PNG versions exist:
   *   /graphic/c1.png ... c8.png
   *   /graphic/w1.png ... w4.png
   */
  const feedbackGraphic = useMemo(() => {
    if (!AWS_URL) return null;
    if (feedbackIdx === null || isCorrect === null) return null;

    return isCorrect
      ? `${AWS_URL}/graphic/c${feedbackIdx}.png`
      : `${AWS_URL}/graphic/w${feedbackIdx}.png`;
  }, [feedbackIdx, isCorrect]);

  const showRightPanel = SCREEN_W >= 720; // tablet / large phone landscape

  return (
    <View style={styles.outerCard}>
      <View style={[styles.innerRow, !showRightPanel && styles.innerCol]}>
        {/* LEFT */}
        <View style={styles.leftCol}>
          <Animated.Text
            entering={FadeInDown.duration(260)}
            style={[styles.headingText, styles.questionTitle]}
          >
            Arrange the numbers in ascending order:
          </Animated.Text>

          <Text style={[styles.headingText, styles.questionSubtitle]}>
            15, 5, 25, 10, 20
          </Text>

          <DraggableRow
            items={items}
            setItems={setItems}
            submitted={submitted}
            isCorrect={isCorrect}
          />

          {/* Feedback */}
          {submitted && (
            <Animated.View
              entering={FadeInDown.duration(240)}
              exiting={FadeOutDown.duration(180)}
              style={[
                styles.feedbackBox,
                isCorrect ? styles.feedbackCorrect : styles.feedbackWrong,
              ]}
            >
              <Text style={[styles.headingText, styles.feedbackTitle]}>
                {isCorrect ? "Correct!" : "Wrong Order"}
              </Text>

              <Text style={[styles.headingText, styles.feedbackBody]}>
                {isCorrect
                  ? "Nicely done! Numbers are in perfect order."
                  : "Try rearranging them again."}
              </Text>
            </Animated.View>
          )}
        </View>

        {/* RIGHT */}
        <View style={styles.rightCol}>
          {/* Buttons */}
          <View style={styles.btnRow}>
            <Pressable
              onPress={() => router.push("/fun-break")}
              style={({ pressed }) => [
                styles.btnBase,
                styles.btnHome,
                pressed && styles.btnPressed,
              ]}
            >
              <Text style={[styles.headingText, styles.btnText]}>
                {homeLabel}
              </Text>
            </Pressable>

            {submitted && !isCorrect && (
              <Pressable
                onPress={handleRetry}
                style={({ pressed }) => [
                  styles.btnBase,
                  styles.btnRetry,
                  pressed && styles.btnPressed,
                ]}
              >
                <Text style={[styles.headingText, styles.btnText]}>
                  {retryLabel}
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={submitted ? onNext : handleSubmit}
              style={({ pressed }) => [
                styles.btnBase,
                styles.btnSubmit,
                pressed && styles.btnPressed,
              ]}
            >
              <Text style={[styles.headingText, styles.btnText]}>
                {submitted ? nextLabel : "Submit"}
              </Text>
            </Pressable>
          </View>

          {/* Cartoon + coin */}
          {submitted && feedbackGraphic && (
            <Animated.View
              entering={FadeInDown.duration(260)}
              exiting={FadeOutDown.duration(200)}
              style={styles.cartoonWrap}
            >
              <View style={styles.cartoonRow}>
                <View style={styles.cartoonBox}>
                  <Image
                    source={{ uri: feedbackGraphic }}
                    style={styles.cartoonImg}
                    resizeMode="contain"
                  />
                </View>

                {isCorrect && (
                  <Animated.View
                    entering={FadeInDown.duration(600)}
                    style={styles.coinBlock}
                  >
                    {/* coin should be PNG too */}
                    <Image
                      source={{
                        uri: AWS_URL ? `${AWS_URL}/graphic/coin.png` : undefined,
                      }}
                      style={styles.coinImg}
                      resizeMode="contain"
                    />
                    <Text style={[styles.headingText, styles.coinText]}>
                      +10
                    </Text>
                  </Animated.View>
                )}
              </View>
            </Animated.View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headingText: {
    fontFamily: "heading1",
  },

  outerCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    shadowOpacity: Platform.OS === "ios" ? 0.12 : 0,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: Platform.OS === "android" ? 2 : 0,
  },

  innerRow: {
    width: "100%",
    flexDirection: "row",
    gap: 16,
  },

  innerCol: {
    flexDirection: "column",
  },

  leftCol: {
    flex: 1,
  },

  rightCol: {
    width: SCREEN_W >= 720 ? 320 : "100%",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 14,
    marginTop: SCREEN_W >= 720 ? 0 : 16,
  },

  questionTitle: {
    fontSize: 20,
    color: "#1F2937",
    marginBottom: 10,
  },

  questionSubtitle: {
    fontSize: 16,
    color: "#374151",
    marginBottom: 14,
  },

  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginBottom: 14,
  },

  cardBase: {
    width: 84,
    height: 64,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  cardDefault: {
    backgroundColor: "#F9FAFB",
    borderColor: "#D1D5DB",
  },

  cardCorrect: {
    backgroundColor: "#DCFCE7",
    borderColor: "#22C55E",
  },

  cardWrong: {
    backgroundColor: "#FEE2E2",
    borderColor: "#EF4444",
  },

  cardTextBase: {
    fontSize: 22,
  },

  cardTextDefault: {
    color: "#111827",
  },

  cardTextCorrect: {
    color: "#166534",
  },

  cardTextWrong: {
    color: "#991B1B",
  },

  feedbackBox: {
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },

  feedbackCorrect: {
    backgroundColor: "#DCFCE7",
    borderColor: "#4ADE80",
  },

  feedbackWrong: {
    backgroundColor: "#FEE2E2",
    borderColor: "#F87171",
  },

  feedbackTitle: {
    fontSize: 16,
    color: "#111827",
    marginBottom: 6,
  },

  feedbackBody: {
    fontSize: 14,
    color: "#111827",
  },

  btnRow: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },

  btnBase: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#111827",
    backgroundColor: "#F97316",
    shadowOpacity: 0.25,
    shadowRadius: 0,
    shadowOffset: { width: 3, height: 5 },
    elevation: 3,
  },

  btnPressed: {
    transform: [{ translateX: 3 }, { translateY: 3 }],
    shadowOpacity: 0,
    elevation: 0,
  },

  btnText: {
    fontSize: 16,
    color: "#FFFFFF",
  },

  btnHome: {
    backgroundColor: "#374151",
  },

  btnRetry: {
    backgroundColor: "#EF4444",
  },

  btnSubmit: {
    backgroundColor: "#F97316",
  },

  cartoonWrap: {
    width: "100%",
    alignItems: "center",
    marginTop: 12,
  },

  cartoonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  cartoonBox: {
    width: 220,
    height: 220,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },

  cartoonImg: {
    width: "92%",
    height: "92%",
  },

  coinBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  coinImg: {
    width: 42,
    height: 42,
  },

  coinText: {
    fontSize: 22,
    color: "#111827",
  },
});
