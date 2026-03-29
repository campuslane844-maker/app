import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, Pressable } from 'react-native';
import HomeExploreSection from '@/components/HomeFunBreakSection';
import api from '@/lib/api';
import { AppHeader } from '@/components/AppHeader';
import HomeContentCard from '@/components/HomeContentCard';
import { ChevronRight } from 'lucide-react-native';
import { useAuthStore } from '@/lib/store/auth';
import HomeGreeting from '@/components/HomeGreeting';
import { useRouter } from 'expo-router';
import HomeFunBreakSection from '@/components/HomeFunBreakSection';
import HomeZonesSection from '@/components/HomeZonesSection';

type HomeData = {
  continueWatching: any[];
  recommended: any[];
  popular: any[];
  recent: any[];
  quickLearning: any[];
  topics: any[];
};

export default function Home() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHome = async () => {
    try {
      const res = await api.get('/home');

      setData(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHome();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHome();
    setRefreshing(false);
  }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const sections = [
    { key: 'continue', title: 'Continue Learning', data: data?.continueWatching },

    { key: 'recommended', title: 'Recommended For You', data: data?.recommended },

    { key: 'popular', title: 'Popular Lessons', data: data?.popular },

    { key: 'quick', title: 'Quick Learning', data: data?.quickLearning },

    { key: 'recent', title: 'Recently Added', data: data?.recent },
  ];

  return (
    <View className='flex-1'>
      <AppHeader />
      <FlatList
        data={sections}
        keyExtractor={(item) => item.key}
        ListHeaderComponent={
          <>
            <HomeGreeting />
            <HomeZonesSection />
            <HomeFunBreakSection />
          </>
        }
        contentContainerStyle={{
    paddingBottom: 40,
  }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => <HomeSection title={item.title} data={item.data as any} />}
      />
    </View>
  );
}

function HomeSection({ title, data }: { title: string; data: any[] }) {
  if (!data || data.length === 0) return null;
  const { user } = useAuthStore();
  const router = useRouter();

  return (
    <View className="mt-6">
      <View className="mb-4 flex flex-row items-center justify-between px-4">
        <Text className="font-heading1 text-lg text-gray-900">{title}</Text>
        <Pressable
          onPress={() => {
            router.push('/worksheets');
          }}
          className="rounded-full bg-gray-400/20 p-1">
          <ChevronRight className="h-2 w-2" />
        </Pressable>
      </View>

      <FlatList
        data={data}
        horizontal
        className="px-4"
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <HomeContentCard content={item} />}
      />
    </View>
  );
}
