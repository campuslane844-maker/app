import React from "react";
import { View, Text } from "react-native";
import ContentCard from "./ContentCard";
import { Content } from "@/types";

export default function ContentGrid({
  contents,
}: {
  contents: Content[];
}) {
  if (!contents || contents.length === 0) {
    return (
      <View style={{ paddingVertical: 64 }}>
        <Text style={{ textAlign: "center", color: "#6B7280" }}>
          No content available yet.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 12, gap: 0 }}>
      {contents.map(item => (
          <ContentCard key={item._id} content={item} />
      ))}
    </View>
  );
}
