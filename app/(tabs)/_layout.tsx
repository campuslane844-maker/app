import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSubscriptionStore } from "@/lib/store/subscription";
import { useAuthStore } from "@/lib/store/auth";
import { useEffect } from "react";

export default function TabsLayout() {
  const { fetchSubscription } = useSubscriptionStore()
  const { user } = useAuthStore();
  useEffect(()=>{
    const fetch = async () => { 
      await fetchSubscription(user?.role as "student" | "teacher");
    }
    fetch();
  }, [user])
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false, 
        tabBarActiveTintColor: "#625c9d",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          height: 100,
          paddingTop: 5,
          borderTopWidth: 0.5,
        },
      }}
    >
      {/* Home */}
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* Explore */}
      <Tabs.Screen
        name="explore/index"
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "compass" : "compass-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* Shop */}
      <Tabs.Screen
        name="shop/index"
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "bag" : "bag-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* Profile */}
      <Tabs.Screen
        name="profile/index"
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
