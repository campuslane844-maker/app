import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import ArrangeNumbersGame from "@/components/fun-break/puzzles/ArrangeNumbersGame";
import CatLegsGame from "@/components/fun-break/puzzles/CatsLegsGame";

const AWS_URL = process.env.EXPO_PUBLIC_AWS_STORAGE_URL;

const { width: SCREEN_W } = Dimensions.get("window");

type GameItem = {
  id: number;
  title: string;
  comp: React.ComponentType<{
    onScore?: (eventIdOrPoints: string | number, points?: number) => void;
    onNext: () => void;
  }>;
};

export default function AllGamesScreen() {
  const router = useRouter();

  const games: GameItem[] = useMemo(
    () => [
    //   { id: 1, title: "Puzzle 1: Number Riddle", comp: NumberRiddleGame },
    //   { id: 2, title: "Puzzle 2: Odd One Out", comp: OddOneOutGame },
      { id: 3, title: "Puzzle 3: Arrange Numbers", comp: ArrangeNumbersGame },
    //   { id: 4, title: "Puzzle 4: Spot the Difference", comp: SpotTheDifferenceGame },
      { id: 5, title: "Puzzle 5: Cat Legs", comp: CatLegsGame },
    //   { id: 6, title: "Puzzle 6: Mystery Number", comp: MysteryNumberGame },
    //   { id: 7, title: "Puzzle 7: Hidden Number", comp: HiddenNumbersGame },
    //   { id: 8, title: "Puzzle 8: Riddle Object", comp: RiddleObjectGame },
    //   { id: 9, title: "Puzzle 9: Missing Sequence", comp: MissingSequenceGame },
    //   { id: 10, title: "Puzzle 10: Shape Question", comp: ShapesQuestionGame },
    ],
    []
  );

  const total = games.length;

  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [score, setScore] = useState(0);

  const finished = index >= total;
  const GameComp = games[index]?.comp;

  // animated progress
  const progressW = useSharedValue(0);

  const progressFraction = Math.max(0, Math.min(1, completed / total));

  React.useEffect(() => {
    progressW.value = withSpring(progressFraction, {
      damping: 18,
      stiffness: 140,
    });
  }, [progressFraction]);

  const progressAnimStyle = useAnimatedStyle(() => {
    return {
      width: `${Math.round(progressW.value * 100)}%`,
    };
  });

  // Score handler supports both:
  // onScore(points) OR onScore(eventId, points)
  const handleScoreUpdate = (eventIdOrPoints: string | number, points?: number) => {
    if (typeof eventIdOrPoints === "number") {
      setScore((prev) => prev + eventIdOrPoints);
    } else if (typeof eventIdOrPoints === "string" && typeof points === "number") {
      setScore((prev) => prev + points);
    }
  };

  const handleNext = useCallback(() => {
    setCompleted((c) => c + 1);
    setIndex((i) => i + 1);
  }, []);

  const handleRestart = () => {
    setIndex(0);
    setCompleted(0);
    setScore(0);
    progressW.value = 0;
  };

  const percentCorrect = total > 0 ? ((score / 10) / total) * 100 : 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headingText, styles.title]}>
            FUN PUZZLE CHALLENGE
          </Text>

          {/* Score box */}
          <View style={styles.scoreBox}>
            {/* NOTE: RN cannot render SVG via Image.
               If coin.svg is SVG, convert it to PNG OR use react-native-svg.
            */}
            <Image
              source={{
                uri: AWS_URL ? `${AWS_URL}/graphic/coin.png` : undefined,
              }}
              style={styles.coin}
              resizeMode="contain"
            />
            <Text style={[styles.headingText, styles.scoreText]}>{score}</Text>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressBlock}>
          <View style={styles.progressLabels}>
            {!finished ? (
              <Text style={[styles.headingText, styles.progressLabelText]}>
                Puzzle {index + 1} of {total}
              </Text>
            ) : (
              <Text style={[styles.headingText, styles.progressLabelText]}>
                Finished
              </Text>
            )}

            <Text style={[styles.headingText, styles.progressLabelText]}>
              {completed} Completed
            </Text>
          </View>

          <View style={styles.progressOuter}>
            <Animated.View style={[styles.progressInner, progressAnimStyle]} />
          </View>
        </View>

        {/* Content */}
        {!finished ? (
          <View style={styles.gameBlock}>
            <Text style={[styles.headingText, styles.gameTitle]}>
              {games[index].title}
            </Text>

            {GameComp ? (
              <GameComp onScore={handleScoreUpdate} onNext={handleNext} />
            ) : null}
          </View>
        ) : (
          <View style={styles.finishCard}>
            <Text
              style={[
                styles.headingText,
                styles.finishTitle,
                percentCorrect >= 50 ? styles.goodText : styles.badText,
              ]}
            >
              {percentCorrect >= 50 ? "NICE WORK!" : "TRY AGAIN!"}
            </Text>

            <Text style={[styles.headingText, styles.finishBody]}>
              You finished all puzzles. You scored{" "}
              <Text style={[styles.headingText, styles.finishBodyStrong]}>
                {score}
              </Text>{" "}
              points.
            </Text>

            <Text style={[styles.headingText, styles.bigScore]}>{score}</Text>

            <View style={styles.finishButtons}>
              <Pressable
                onPress={handleRestart}
                style={({ pressed }) => [
                  styles.btnBase,
                  styles.btnPrimary,
                  pressed && styles.btnPressed,
                ]}
              >
                <Text style={[styles.headingText, styles.btnText]}>Restart</Text>
              </Pressable>

              <Pressable
                onPress={() => router.push("/fun-break")}
                style={({ pressed }) => [
                  styles.btnBase,
                  styles.btnPrimary,
                  pressed && styles.btnPressed,
                ]}
              >
                <Text style={[styles.headingText, styles.btnText]}>Home</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Footer tip */}
        <Text style={[styles.headingText, styles.footerTip]}>
          Tip: Each puzzle awards points once. Your progress is saved while playing.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headingText: {
    fontFamily: "heading1",
  },

  screen: {
    flex: 1,
    backgroundColor: "#111827",
  },

  scrollContent: {
    paddingTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 40,
    alignItems: "center",
  },

  header: {
    width: "100%",
    maxWidth: 1100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 18,
  },

  title: {
    fontSize: 26,
    color: "#FFFFFF",
    flex: 1,
  },

  scoreBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  coin: {
    width: 28,
    height: 28,
  },

  scoreText: {
    fontSize: 20,
    color: "#111827",
  },

  progressBlock: {
    width: "100%",
    maxWidth: 1100,
    marginBottom: 22,
  },

  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  progressLabelText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },

  progressOuter: {
    width: "100%",
    height: 18,
    borderRadius: 999,
    backgroundColor: "#D1D5DB",
    overflow: "hidden",
  },

  progressInner: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#F97316",
  },

  gameBlock: {
    width: "100%",
    maxWidth: 1100,
  },

  gameTitle: {
    fontSize: 20,
    color: "#FFFFFF",
    marginBottom: 14,
  },

  finishCard: {
    width: "100%",
    maxWidth: 1100,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
  },

  finishTitle: {
    fontSize: 30,
    marginBottom: 10,
  },

  goodText: {
    color: "#16A34A",
  },

  badText: {
    color: "#EF4444",
  },

  finishBody: {
    fontSize: 14,
    color: "#111827",
    textAlign: "center",
    marginTop: 4,
  },

  finishBodyStrong: {
    fontSize: 14,
    color: "#111827",
  },

  bigScore: {
    fontSize: 44,
    color: "#111827",
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },

  finishButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
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

  btnPrimary: {
    backgroundColor: "#F97316",
  },

  btnText: {
    fontSize: 16,
    color: "#FFFFFF",
  },

  footerTip: {
    width: "100%",
    maxWidth: 1100,
    textAlign: "center",
    marginTop: 18,
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
});
