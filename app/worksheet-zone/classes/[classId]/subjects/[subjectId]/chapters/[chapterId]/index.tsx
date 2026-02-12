import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Search, Filter, X } from "lucide-react-native";

import api from "@/lib/api";
import FilterDrawer from "@/components/FilterDrawer";
import { AppHeader } from "@/components/AppHeader";
import ContentCard from "@/components/ContentCard";
import { Content } from "@/types";

const LIMIT = 20;

export default function ChapterContentScreen() {
  const { classId, subjectId, chapterId } = useLocalSearchParams<{
    classId: string;
    subjectId: string;
    chapterId: string;
  }>();
  
  const [refreshing, setRefreshing] = useState(false);

  /* ================= STATE ================= */
  const [contents, setContents] = useState<Content[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  /* ---- search ---- */
  const [search, setSearch] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  /* ---- filters ---- */
  const [filters, setFilters] = useState<{
    paid?: boolean;
    type?: string;
  }>({});

  const [filterOpen, setFilterOpen] = useState(false);

  /* ---- refs ---- */
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* ================= SEARCH (DEBOUNCE) ================= */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(search.trim());
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  /* ================= PARAM BUILDER ================= */
  const buildParams = useCallback(
    (pageNum: number) => ({
      page: pageNum,
      limit: LIMIT,

      // fixed from route
      classId,
      subjectId,
      chapterId,

      // search
      search: debouncedQuery || undefined,

      // filters
      paid: filters.paid,
      type: filters.type,
    }),
    [classId, subjectId, chapterId, debouncedQuery, filters]
  );

  /* ================= FETCH ================= */
  const fetchPage = useCallback(
    async (pageNum: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);

      try {
        const res = await api.get("/content", {
          params: buildParams(pageNum),
          signal: controller.signal,
        });

        const data = Array.isArray(res.data.data) ? res.data.data : [];
        setContents((prev) => (pageNum === 1 ? data : [...prev, ...data]));

        setHasMore(data.length === LIMIT);
        setPage(pageNum);
      } catch (err: any) {
        if (err?.name !== "CanceledError") {
          console.error(err);
        }
      } finally {
        setLoading(false);
      }
    },
    [buildParams]
  );

  /* ================= REFRESH ================= */
  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      setHasMore(true);
      setPage(1);

      await fetchPage(1);
    } finally {
      setRefreshing(false);
    }
  }, [fetchPage]);

  /* ================= RESET & FETCH ================= */
  useEffect(() => {
    if (!classId || !subjectId || !chapterId) return;

    setPage(1);
    setHasMore(true);
    fetchPage(1);
  }, [classId, subjectId, chapterId, filters, debouncedQuery]);

  /* ================= LOAD MORE ================= */
  const loadMore = () => {
    if (!loading && hasMore) {
      fetchPage(page + 1);
    }
  };

  /* ================= INITIAL ================= */
  useEffect(() => {
    if (!classId || !subjectId || !chapterId) return;
    fetchPage(1);
  }, []);

  /* ================= HELPERS ================= */
  const clearSearch = useCallback(() => {
    setSearch("");
    setDebouncedQuery("");
  }, []);

  return (
    <>
      {/* Fixed app header */}
      <AppHeader showBack />

      {/* Scrollable content */}
      <FlatList
        data={contents}
        keyExtractor={(item) => item._id}
        numColumns={2}
        renderItem={({ item }) => (
          <View style={{ flex: 1 }}>
            <ContentCard content={item} />
          </View>
        )}
        ListHeaderComponent={
          <SearchHeader
            search={search}
            setSearch={setSearch}
            clearSearch={clearSearch}
          />
        }
        ListFooterComponent={
          loading ? (
            <View className="py-6">
              <ActivityIndicator />
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        stickyHeaderIndices={[0]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        columnWrapperStyle={{ gap: 6 }}
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingBottom: 90,
        }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
      />
    </>
  );
}

/* ================= SEARCH HEADER ================= */

const SearchHeader = React.memo(
  ({ search, setSearch, clearSearch }: any) => {
    return (
      <View className="border-gray-200 bg-white pb-3 pt-4">
        <View className="h-11 flex-row items-center gap-3 rounded-xl border border-gray-300 bg-gray-50 px-3">
          <Search size={18} color="#6B7280" />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search content"
            placeholderTextColor="#9CA3AF"
            className="flex-1 font-sans text-sm text-gray-900"
            returnKeyType="search"
          />

          {search.length > 0 && (
            <Pressable onPress={clearSearch} hitSlop={10}>
              <X size={16} color="#6B7280" />
            </Pressable>
          )}
        </View>
      </View>
    );
  }
);
