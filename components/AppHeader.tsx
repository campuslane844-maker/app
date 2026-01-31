import { View, Text, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { MenuSheet } from './MenuSheet';

interface AppHeaderProps {
  showBack?: boolean;
  onMenuPress?: () => void;
}

export function AppHeader({ showBack = false, onMenuPress }: AppHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View style={{ paddingTop: insets.top }} className="border-b border-gray-200 bg-white shadow">
      <View className="h-16 flex-row items-center justify-between px-4">
        {/* Left */}
        <View className="flex-row items-center gap-3">
          {showBack && (
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              className="rounded-full bg-gray-100 p-2">
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </Pressable>
          )}
          <Image
            source={{
              uri: `${process.env.EXPO_PUBLIC_AWS_URL}/logos/logos/FULL LOGO HORIZONTAL COLOR.png`,
            }}
            className="h-8 w-32"
            resizeMode="contain"
          />
        </View>

        {/* Right */}
        <Pressable onPress={() => setMenuOpen(!menuOpen)} hitSlop={10}>
          <Ionicons name="menu" size={26} color="#111827" />
        </Pressable>
      </View>

      <MenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  );
}
