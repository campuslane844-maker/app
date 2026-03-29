import React from "react";
import { View, Text } from "react-native";
import { useAuthStore } from "@/lib/store/auth";

export default function HomeGreeting() {
  const { user } = useAuthStore();

  const name = user?.name?.split(" ")[0] ?? "Learner";

  const hour = new Date().getHours();

  let greeting = "Hi";

  if (hour < 12) greeting = "Good Morning";
  else if (hour < 18) greeting = "Good Afternoon";
  else greeting = "Good Evening";

  return (
    <View className="px-4 pt-4 pb-2">
      <Text className="font-heading1 text-2xl text-gray-900">
        {greeting}, {name} 👋
      </Text>

      <Text className="font-sans text-sm text-gray-500 mt-1">
        Let’s continue learning today
      </Text>
    </View>
  );
}