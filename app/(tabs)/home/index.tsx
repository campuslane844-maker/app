import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Search, Filter, X } from 'lucide-react-native';
import api from '@/lib/api';

import FilterDrawer from '@/components/FilterDrawer';
import { AppHeader } from '@/components/AppHeader';
import { Content } from '@/types';
import ContentCard from '@/components/ContentCard';

const LIMIT = 20;

export default function Home() {
  const [refreshing, setRefreshing] = useState(false);
  
  /* ================= STATE ================= */
  const [contents, setContents] = useState<Content[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const listData = useRef([{ key: 'grid' }]).current;
  /* ---- search ---- */
  const [search, setSearch] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  /* ---- filters ---- */
  const [filters, setFilters] = useState<{
    classId?: string;
    subjectId?: string;
    chapterId?: string;
    paid?: boolean;
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
      search: debouncedQuery || undefined,
      classId: filters.classId,
      subjectId: filters.subjectId,
      chapterId: filters.chapterId,
      paid: filters.paid,
    }),
    [debouncedQuery, filters]
  );

  /* ================= FETCH ================= */
  const fetchPage = useCallback(
    async (pageNum: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);

      try {
        const res = await api.get('/content', {
          params: buildParams(pageNum),
          signal: controller.signal,
        });

        const data = Array.isArray(res.data.data) ? res.data.data : [];

        setContents((prev) => (pageNum === 1 ? data : [...prev, ...data]));

        setHasMore(data.length === LIMIT);
        setPage(pageNum);
      } catch (err: any) {
        if (err?.name !== 'CanceledError') {
          console.error(err);
        }
      } finally {
        setLoading(false);
      }
    },
    [buildParams]
  );

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
    setPage(1);
    setHasMore(true);
    fetchPage(1);
  }, [filters, debouncedQuery]);

  /* ================= LOAD MORE ================= */
  const loadMore = () => {
    if (!loading && hasMore) {
      fetchPage(page + 1);
    }
  };

  /* ================= INITIAL ================= */
  useEffect(() => {
    fetchPage(1);
  }, []);
  
  const clearSearch = useCallback(() => {
  setSearch("");
  setDebouncedQuery("");
}, []);


  return (
    <>
      {/* Fixed app header */}
      <AppHeader />

      {/* Scrollable content */}
      <FlatList
        data={contents}
        key={2}
        numColumns={2}
        keyExtractor={(item) => item._id}
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        stickyHeaderIndices={[0]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        columnWrapperStyle={{ gap: 6 }}
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingBottom: 20,
        }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
      />

      {/* ================= FILTER BUTTON ================= */}
      <Pressable
        onPress={() => setFilterOpen(true)}
        className="absolute bottom-4 right-4 flex-row items-center gap-2 rounded-full bg-primary px-5 py-3 shadow-xl">
        <Filter size={16} color="#fff" />
        <Text className="font-sans font-semibold text-white">Filters</Text>
      </Pressable>

      {/* ================= FILTER DRAWER ================= */}
      <FilterDrawer
        visible={filterOpen}
        filters={filters}
        onClose={() => setFilterOpen(false)}
        onChange={(partial) => {
          setFilters((prev) => ({
            ...prev,
            ...partial,
          }));
        }}
      />
    </>
  );
}

const SearchHeader = React.memo(
  ({ search, setSearch, clearSearch }: any) => {
    return (
      <View className="border-gray-200 bg-white pb-3 pt-4">
        <View className="h-11 flex-row items-center gap-3 rounded-xl border border-gray-300 bg-gray-50 px-3">
          <Search size={18} color="#6B7280" />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search lessons"
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

