import React, { useMemo } from "react";
import { View, Pressable, Image, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { MotiView, MotiText } from "moti";

import { useAuthStore } from "@/lib/store/auth";

const AWS_URL = process.env.EXPO_PUBLIC_AWS_URL;

type CardItem = {
  src: string;
  route:
    | "/fun-break/riddles"
    | "/fun-break/jokes"
    | "/fun-break/tongue-twisters"
    ;
};

export default function FunBreakPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const firstName = useMemo(() => {
    if (!user?.name) return null;
    return user.name.split(" ")[0];
  }, [user?.name]);

  const cards: CardItem[] = useMemo(
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
    <View className="flex-1 bg-primary">

      <FlatList
        data={cards}
        keyExtractor={(item) => item.route}
        
        contentContainerStyle={{
          paddingTop: 24,
          paddingBottom: 40,
          gap: 14,
          paddingHorizontal: 12,
        }}
        ListHeaderComponent={
          <View className="px-4 pb-5 pt-6">
            {/* Greeting */}
            {firstName && (
              <MotiText
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "timing", duration: 450 }}
                className="text-2xl font-heading1 text-white text-center"
              >
                Hi, {firstName}
              </MotiText>
            )}

            {/* Main heading */}
            <MotiText
              from={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", delay: 250, damping: 12 }}
              className="mt-2 font-heading1 text-4xl tracking-wide text-white text-center"
            >
              LET&apos;S HAVE FUN !
            </MotiText>
          </View>
        }
        renderItem={({ item, index }) => {
          return (
            <MotiView
              from={{ opacity: 0, scale: 0.9, translateY: 20 }}
              animate={{ opacity: 1, scale: 1, translateY: 0 }}
              transition={{
                type: "timing",
                duration: 400,
                delay: index * 120,
              }}
              style={{ flex: 1 }}
            >
              <Pressable
                onPress={() => router.push(item.route)}
                className="rounded-2xl border border-gray-200 bg-white overflow-hidden"
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                <View className="aspect-video bg-white">
                  <Image
                    source={{ uri: item.src }}
                    resizeMode="contain"
                    style={{ width: "100%", height: "100%" }}
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
