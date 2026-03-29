import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSubscriptionStore } from "@/lib/store/subscription";
import { useAuthStore } from "@/lib/store/auth";
import { useEffect } from "react";

export default function TabsLayout() {
  const { fetchSubscription } = useSubscriptionStore();
  const { user, fetchMe } = useAuthStore();

  // Fetch user once
  useEffect(() => {
    fetchMe();
  }, []);

  // Fetch subscription only when role exists
  useEffect(() => {
    if (!user?.role) return;

    if (user.role === "student" || user.role === "teacher") {
      fetchSubscription(user.role);
    }
  }, [user?.role]);
  
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
        name="home/index"
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
        name="explore"
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
        name="shop"
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
        name="profile"
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
