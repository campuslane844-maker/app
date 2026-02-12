import React, { useMemo } from "react";
import { View, ScrollView } from "react-native";
import { MotiText } from "moti";

import DailyRiddleTemplate from "@/components/fun-break/riddles/DailyRiddleTemplate";
import { DAILY_RIDDLES } from "@/data/riddles/daily";
import { AppHeader } from "@/components/AppHeader";

export default function DailyRiddlePage() {
  const todayRiddle = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const hash = today.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return DAILY_RIDDLES[hash % DAILY_RIDDLES.length];
  }, []);

  return (
    <View className="flex-1 bg-primary">

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 28,
          paddingBottom: 50,
        }}
      >
        <MotiText
          from={{ opacity: 0, scale: 0.9, translateY: -20 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 500 }}
          className="text-4xl font-heading1 tracking-wider text-white text-center mb-8"
        >
          DAILY RIDDLE
        </MotiText>

        <DailyRiddleTemplate
          riddle={todayRiddle.riddle}
          options={todayRiddle.options}
          answer={todayRiddle.answer}
          funFact={todayRiddle.funFact}
        />
      </ScrollView>
    </View>
  );
}
