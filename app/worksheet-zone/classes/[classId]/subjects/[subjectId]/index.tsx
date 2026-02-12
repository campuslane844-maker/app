import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MotiView } from "moti";
import { Search, X } from "lucide-react-native";

import api from "@/lib/api";
import { AppHeader } from "@/components/AppHeader";

type ChapterType = {
  _id: string;
  name: string;
  description?: string;
  thumbnailKey?: string;
};

type SubjectType = { _id: string; name: string };
type ClassType = { _id: string; name: string };

const AWS_URL = process.env.EXPO_PUBLIC_AWS_URL;

export default function ChaptersScreen() {
  const { classId, subjectId } = useLocalSearchParams<{
    classId: string;
    subjectId: string;
  }>();

  const router = useRouter();

  const [chapters, setChapters] = useState<ChapterType[]>([]);
  const [classItem, setClassItem] = useState<ClassType | null>(null);
  const [subject, setSubject] = useState<SubjectType | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [chRes, sRes, cRes] = await Promise.all([
          api.get("/chapters", { params: { subjectId } }),
          api.get("/subjects", { params: { id: subjectId } }),
          api.get("/classes", { params: { id: classId } }),
        ]);

        setChapters(Array.isArray(chRes.data.data) ? chRes.data.data : []);

        setSubject(
          Array.isArray(sRes.data.data) ? sRes.data.data[0] : sRes.data.data
        );

        setClassItem(
          Array.isArray(cRes.data.data) ? cRes.data.data[0] : cRes.data.data
        );
      } catch (err) {
        console.error("Error fetching chapters:", err);
      } finally {
        setLoading(false);
      }
    };

    if (classId && subjectId) fetchData();
  }, [classId, subjectId]);

  const filteredChapters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return chapters;

    return chapters.filter((ch) => ch.name.toLowerCase().includes(q));
  }, [chapters, searchQuery]);

  if (loading) {
    return (
      <View className="flex-1 bg-neutral-50">
        <AppHeader showBack />

        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
          <Text className="mt-3 text-base text-slate-400">Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-50">
      <AppHeader showBack />

      <FlatList
        data={filteredChapters}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: 28,
          paddingHorizontal: 16,
        }}
        ListHeaderComponent={
          <View className="mb-4">
            {/* Breadcrumb */}
            <View className="mb-4">
              <Text className="text-sm font-heading1 text-slate-500">
                Home
                {classItem?.name ? (
                  <Text className="text-slate-500"> / {classItem.name}</Text>
                ) : null}
                {subject?.name ? (
                  <Text className="font-semibold text-slate-700">
                    {" "}
                    / {subject.name}
                  </Text>
                ) : null}
              </Text>
            </View>

            {/* Heading */}
            <View className="mb-4">
              <Text className="text-3xl font-heading1 tracking-wide text-slate-900">
                Chapters
              </Text>
              <Text className="mt-1 font-heading1 text-sm text-slate-500">
                {subject ? `${subject.name}` : "Select a subject"}
              </Text>
            </View>

            {/* Search */}
            <View className="h-11 flex-row items-center gap-2 rounded-xl border border-gray-200 bg-white px-3">
              <Search size={18} color="#CBD5E1" />

              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search chapters..."
                placeholderTextColor="#94A3B8"
                className="flex-1 font-heading1 text-sm text-slate-900"
                returnKeyType="search"
              />

              {!!searchQuery && (
                <Pressable onPress={() => setSearchQuery("")} hitSlop={10}>
                  <X size={16} color="#94A3B8" />
                </Pressable>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View className="mt-4 rounded-xl border border-gray-200 bg-white p-10">
            <Text className="text-center text-slate-500">
              No chapters found.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const imageUrl =
            item.thumbnailKey && AWS_URL
              ? `${AWS_URL}/${item.thumbnailKey}`
              : null;

          return (
            <MotiView
              from={{ opacity: 0, translateY: 16 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{
                type: "timing",
                duration: 450,
                delay: index * 70,
              }}
              className="mb-4"
            >
              <Pressable
                onPress={() =>
                  router.push(
                    `/worksheet-zone/classes/${classId}/subjects/${subjectId}/chapters/${item._id}`
                  )
                }
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.99 : 1 }],
                })}
              >
                {/* Thumbnail */}
                <View className="h-52 w-full bg-gray-100">
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
                  <Text
                    className="text-lg font-heading1 text-slate-800"
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>

                  {!!item.description && (
                    <Text
                      className="mt-1 text-sm text-slate-500"
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
