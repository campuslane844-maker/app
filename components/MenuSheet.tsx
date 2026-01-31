import {
  Modal,
  View,
  Text,
  Pressable,
  Animated,
  Dimensions,
  PanResponder,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MobileExploreMenu from './MobileExploreMenu';
import { useAuthStore } from '@/lib/store/auth';
import { QUICK_LINKS } from '@/lib/constants/quickLinks';

const SCREEN_WIDTH = Dimensions.get('window').width;
const MENU_WIDTH = SCREEN_WIDTH * 0.78;
const CLOSE_THRESHOLD = MENU_WIDTH * 0.35;

interface MenuSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function MenuSheet({ visible, onClose }: MenuSheetProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const translateX = useRef(new Animated.Value(-MENU_WIDTH)).current;
  const { user, logout } = useAuthStore();
  const userName = (user?.name || user?.email || '').toString();

  /* ---------------- Animation ---------------- */
  useEffect(() => {
    Animated.spring(translateX, {
      toValue: visible ? 0 : -MENU_WIDTH,
      useNativeDriver: true,
      damping: 20,
      stiffness: 180,
      mass: 0.7,
    }).start();
  }, [visible]);

  /* ---------------- Swipe Gesture ---------------- */
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dx > 8 && Math.abs(g.dy) < 20,

      onPanResponderMove: (_, g) => {
        if (g.dx > 0) {
          translateX.setValue(Math.min(g.dx, MENU_WIDTH));
        }
      },

      onPanResponderRelease: (_, g) => {
        if (g.dx > CLOSE_THRESHOLD) {
          onClose();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Pressable onPress={onClose} className="flex-1 bg-black/40" />

      {/* Drawer */}
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          width: MENU_WIDTH,
          transform: [{ translateX }],
        }}
        className="absolute bottom-0 left-0 top-0 bg-white">
        <SafeAreaView className="flex-1">
          {/* ================= HEADER ================= */}
          <View
            style={{ paddingTop: Math.max(insets.top, 16) }}
            className="flex flex-row items-center gap-4 border-b border-gray-200 px-5 pb-6">
            <View className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
              <Text className="font-sans text-lg font-bold text-indigo-700">
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>

            <View>
              <Text className="font-sans text-lg">{userName}</Text>
              <Text className="font-sans capitalize text-gray-800">{user?.role}</Text>
            </View>
          </View>

          {/* ================= SCROLLABLE CONTENT ================= */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: 16,
              paddingBottom: 32 + insets.bottom,
            }}
            className="flex-1">
              
            {/* Menu Items */}
            <View className="px-2">
              <MenuItem
                icon="person-outline"
                label="Profile"
                onPress={() => {
                  onClose();
                  router.push('/(tabs)/profile');
                }}
              />

              {user?.role === 'student' && (
                <MenuItem
                  icon="bar-chart"
                  label="Progress"
                  onPress={() => {
                    onClose();
                    router.push('/(tabs)/explore');
                  }}
                />
              )}
            </View>
            <MobileExploreMenu onClose={onClose} />

            {/* Interactive */}
            <View className="mt-4">
              <View className="px-3">
                <Text className="font-sans text-xs font-bold uppercase text-[#6B7280]">
                  Interactive
                </Text>
              </View>

              <View className="mt-4 flex flex-col gap-3 px-4">
                {QUICK_LINKS.map((item: any) => (
                  <Pressable
                    key={item.label}
                    onPress={() => router.push(item.href)}
                    className={`flex w-full flex-row items-center gap-2 rounded-full p-2 ${item.bg}`}>
                    <item.icon />
                    <Text className="font-sans text-sm">{item.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* ================= FOOTER ================= */}
          <View
            style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            className="border-t border-gray-200 px-5 pt-4">
            <Pressable
              onPress={() => {
                onClose();
                logout();
                router.replace('/');
              }}
              className="flex-row items-center gap-3">
              <Ionicons name="log-out-outline" size={22} color="#EF4444" />
              <Text className="font-sans text-base text-red-500">Logout</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

/* ---------------- Menu Item ---------------- */

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-4 rounded-xl px-4 py-3 active:bg-gray-100">
      <Ionicons name={icon} size={22} color="#111827" />
      <Text className="font-sans">{label}</Text>
    </Pressable>
  );
}
