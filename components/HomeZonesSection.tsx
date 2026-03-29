import React from "react";
import { View, FlatList, Text, Pressable } from "react-native";
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
    label: "Spoken English",
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

export default function HomeZonesSection() {
  return (
    <View className="mt-6">
      {/* Title */}
      <Text className="font-heading1 text-lg text-slate-900 px-4 mb-4">
        Explore Zones
      </Text>

      <FlatList
        data={QUICK_LINKS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.label}
        contentContainerStyle={{
          paddingHorizontal: 16,
          gap: 14,
        }}
        renderItem={({ item }) => {
          const Icon = item.icon;

          return (
            <Pressable
              onPress={() => router.push(item.href as any)}
              style={({ pressed }) => [
                { width: 80, alignItems: "center" },
                pressed && { transform: [{ scale: 0.95 }] },
              ]}
            >
              {/* Colored icon container */}
              <View
                className={`h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 ${item.bg}`}
                
              >
                <Icon size={22} color="#0f172a" />
              </View>

              {/* Label */}
              <Text
  className="text-xs line-clamp-2 font-heading2 text-slate-700 mt-2 text-center"
  style={{ width: 70 }}
>
  {item.label}
</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}