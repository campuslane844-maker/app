import React from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import {
  BookOpen,
  Download,
  Gamepad2,
  Paintbrush2,
  Puzzle,
  Sparkles,
  Sprout,
} from "lucide-react-native";
import { AppHeader } from "@/components/AppHeader";

const QUICK_LINKS = [
  {
    label: "Fun Break",
    href: "/fun-break",
    desc: "Short activities to relax",
    bg: "bg-yellow-50",
    icon: Sparkles,
  },
  {
    label: "Worksheet Zone",
    href: "/worksheet-zone/classes",
    desc: "Explore study material",
    bg: "bg-green-50",
    icon: Download,
  },
  {
    label: "Vocabulary",
    href: "/(tabs)/explore/coming-soon",
    desc: "Learn new words",
    bg: "bg-pink-50",
    icon: BookOpen,
  },
  {
    label: "Yoga Zone",
    href: "/(tabs)/explore/coming-soon",
    desc: "Learn yoga asanas daily",
    bg: "bg-orange-50",
    icon: Sprout,
  },
  {
    label: "Spoken English Zone",
    href: "/(tabs)/explore/coming-soon",
    desc: "Watch interactive lessons",
    bg: "bg-purple-50",
    icon: Puzzle,
  },
  {
    label: "Art Lab",
    href: "/(tabs)/explore/coming-soon",
    desc: "Learn art and craft",
    bg: "bg-red-50",
    icon: Paintbrush2,
  },
  {
    label: "Learn & Play",
    href: "/(tabs)/explore/coming-soon",
    desc: "Interactive learning games",
    bg: "bg-blue-50",
    icon: Gamepad2,
  },
];

export default function Explore() {
  return (
    <View className="flex-1 bg-neutral-50">
      <AppHeader />

      <FlatList
        data={QUICK_LINKS}
        keyExtractor={(item) => item.label}
        contentContainerClassName="px-4 pb-8"
        ListHeaderComponent={
          <View className="pt-4 pb-3">
            <Text className="font-heading1 text-2xl text-slate-900">
              Explore
            </Text>
            <Text className="font-sans mt-1 text-sm font-semibold text-slate-500">
              Pick a zone and start learning
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={({ item }) => {
          const Icon = item.icon;

          return (
            <Pressable
              onPress={() => router.push(item.href as any)}
              className={`rounded-3xl border border-slate-200 ${item.bg} px-5 py-5`}
              style={({ pressed }) => [
                pressed && { transform: [{ scale: 0.99 }], opacity: 0.95 },
              ]}
            >
              <View className="flex-row items-center gap-4">
                {/* icon square */}
                <View className="h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <Icon size={26} color="#0f172a" />
                </View>

                {/* text */}
                <View className="flex-1">
                  <Text
                    className="font-heading1 text-lg text-slate-900"
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                  <Text
                    className="mt-1 text-sm font-sans text-slate-600"
                    numberOfLines={1}
                  >
                    {item.desc}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
