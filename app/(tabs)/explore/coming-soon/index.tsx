import React from "react";
import { View, Text } from "react-native";
import { AppHeader } from "@/components/AppHeader";

export default function ComingSoon() {
  return (
    <View className="flex-1 bg-background">
      {/* App Header */}
      <AppHeader showBack />

      {/* Content */}
      <View className="flex-1 items-center justify-center px-6">
        <View className="max-w-xl items-center">
          <Text className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            CampusLane
          </Text>

          <Text className="mb-4 text-4xl font-extrabold tracking-tight text-foreground text-center">
            Coming Soon 🚀
          </Text>

          <Text className="mb-8 text-base text-muted-foreground text-center leading-6">
            We’re working hard to bring you something amazing.
            {"\n"}
            Stay tuned — launch is just around the corner.
          </Text>

          <View className="rounded-full border border-border bg-muted px-5 py-2">
            <Text className="text-sm font-semibold text-muted-foreground">
              Launching shortly
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
