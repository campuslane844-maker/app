import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import api from "@/lib/api";
import { AppHeader } from "@/components/AppHeader";

type ClassType = {
  _id: string;
  name: string;
  description?: string;
  thumbnailKey?: string;
};

const AWS_URL = process.env.EXPO_PUBLIC_AWS_URL;

export default function ClassesScreen() {
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get("/classes");
        setClasses(Array.isArray(res.data.data) ? res.data.data : []);
      } catch (err) {
        console.error("Error fetching classes:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center">
        <ActivityIndicator size="large" />
        <Text className="mt-3 text-base text-slate-400">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-50">
      <AppHeader showBack />

      <FlatList
        data={classes}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{
          paddingTop: 18,
          paddingBottom: 30,
          paddingHorizontal: 16,
          gap: 14,
        }}
        renderItem={({ item, index }) => {
          const imageUrl =
            item.thumbnailKey && AWS_URL
              ? `${AWS_URL}/${item.thumbnailKey}`
              : null;

          return (
            <MotiView
              from={{ opacity: 0, translateY: 18 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{
                type: "timing",
                duration: 450,
                delay: index * 80,
              }}
            >
              <Pressable
                onPress={() => router.push(`/worksheet-zone/classes/${item._id}`)}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden"
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.99 : 1 }],
                })}
              >
                {/* Image */}
                <View className="h-44 w-full bg-gray-100">
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      resizeMode="cover"
                      className="h-full w-full"
                    />
                  ) : (
                    <View className="h-full w-full items-center justify-center">
                      <Text className="text-gray-400">No Image</Text>
                    </View>
                  )}
                </View>

                {/* Info */}
                <View className="p-4">
                  <Text className="text-lg font-heading1 text-gray-900">
                    {item.name}
                  </Text>

                  {!!item.description && (
                    <Text
                      className="mt-1 text-sm text-gray-500"
                      numberOfLines={3}
                    >
                      {item.description}
                    </Text>
                  )}
                </View>
              </Pressable>
            </MotiView>
          );
        }}
      />
    </View>
  );
}
