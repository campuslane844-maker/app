import React, { useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, Image } from "react-native";
import { useRouter } from "expo-router";
import { MotiView, MotiText } from "moti";

const AWS_URL = process.env.EXPO_PUBLIC_AWS_URL;

type Card = {
  src: string;
  route:
    | "/fun-break/riddles/fun-tricky-riddles"
    | "/fun-break/riddles/math-riddles"
    | "/fun-break/riddles/nature-riddles"
    | "/fun-break/riddles/word-riddles";
};

export default function RiddlesPage() {
  const router = useRouter();

  const cards: Card[] = useMemo(
    () => [
      {
        src: `${AWS_URL}/folder/fun-riddles.png`,
        route: "/fun-break/riddles/fun-tricky-riddles",
      },
      {
        src: `${AWS_URL}/folder/math-riddles.png`,
        route: "/fun-break/riddles/math-riddles",
      },
      {
        src: `${AWS_URL}/folder/nature-riddles.png`,
        route: "/fun-break/riddles/nature-riddles",
      },
      {
        src: `${AWS_URL}/folder/word-riddles.png`,
        route: "/fun-break/riddles/word-riddles",
      },
    ],
    []
  );

  const [loadedImages, setLoadedImages] = useState<boolean[]>(
    Array(cards.length).fill(false)
  );

  return (
    <View className="flex-1 bg-primary">
      <FlatList
        data={cards}
        keyExtractor={(item) => item.route}
        contentContainerStyle={{
          paddingTop: 20,
          paddingBottom: 50,
          paddingHorizontal: 16,
          gap: 14,
        }}
        ListHeaderComponent={
          <View className="items-center gap-6 pb-4 pt-10">
            {/* Heading */}
            <MotiText
              from={{ opacity: 0, scale: 0.8, translateY: -40 }}
              animate={{ opacity: 1, scale: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 600 }}
              className="text-4xl font-heading1 tracking-wider text-white"
            >
              RIDDLE TIME!
            </MotiText>

            {/* Daily Button */}
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", delay: 250, duration: 500 }}
            >
              <Pressable
                onPress={() => router.push("/fun-break/riddles/daily")}
                className="rounded-full border border-gray-800 bg-orange-500 px-7 py-4"
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text className="text-lg font-extrabold text-white">
                  Solve Daily Riddle
                </Text>
              </Pressable>
            </MotiView>
          </View>
        }
        renderItem={({ item, index }) => {
          const loaded = loadedImages[index];

          return (
            <MotiView
              from={{ opacity: 0, scale: 0.95, translateY: 18 }}
              animate={{ opacity: 1, scale: 1, translateY: 0 }}
              transition={{
                type: "timing",
                duration: 420,
                delay: index * 120,
              }}
            >
              <Pressable
                onPress={() => router.push(item.route)}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                {/* Skeleton */}
                {!loaded && (
                  <View className="absolute inset-0 bg-gray-200 opacity-60" />
                )}

                <View className="aspect-video bg-white">
                  <Image
                    source={{ uri: item.src }}
                    resizeMode="contain"
                    style={{ width: "100%", height: "100%" }}
                    onLoadEnd={() => {
                      setLoadedImages((prev) => {
                        const updated = [...prev];
                        updated[index] = true;
                        return updated;
                      });
                    }}
                  />
                </View>
              </Pressable>
            </MotiView>
          );
        }}
      />
    </View>
  );
}
