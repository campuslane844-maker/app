import React, { useMemo } from "react";
import { View, FlatList, Image, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { MotiView } from "moti";

const AWS_URL = process.env.EXPO_PUBLIC_AWS_URL;

export default function HomeFunBreakSection() {
  const router = useRouter();

  const cards = useMemo(
    () => [
      {
        src: `${AWS_URL}/folder/riddle-cover.png`,
        route: "/fun-break/riddles",
      },
      {
        src: `${AWS_URL}/folder/jokes-cover.png`,
        route: "/fun-break/jokes",
      },
      {
        src: `${AWS_URL}/folder/tongue-twisters-cover.png`,
        route: "/fun-break/tongue-twisters",
      },
    ],
    []
  );

  return (
    <View className="mt-4">
      <FlatList
        horizontal
        data={cards}
        keyExtractor={(item) => item.route}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        renderItem={({ item, index }) => (
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: index * 120 }}
          >
            <Pressable
              onPress={() => router.push(item.route as any)}
              style={({ pressed }) => ({
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
              className="overflow-hidden rounded-2xl bg-white"
            >
              <Image
                source={{ uri: item.src }}
                style={{ width: 220, height: 120 }}
                resizeMode="cover"
              />
            </Pressable>
          </MotiView>
        )}
      />
    </View>
  );
}