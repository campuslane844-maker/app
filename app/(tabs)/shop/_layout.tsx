import React from "react";
import { Tabs } from "expo-router";
import { Heart, Package, ShoppingBasket, ShoppingCart } from "lucide-react-native";

export default function ShopLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "white",
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
        },
        tabBarActiveTintColor: "#0f172a",
        tabBarInactiveTintColor: "#64748b",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "800",
          textTransform: "none",
        },
        
      }}
    >
      {/* Visible tabs */}
      <Tabs.Screen
        name="orders/index"
        options={{
          title: "Orders",
          tabBarIcon: ({ color }) => <Package size={18} color={color} />,
        }}
      />
      <Tabs.Screen
        name="wishlist/index"
        options={{
          title: "Wishlist",
          tabBarIcon: ({ color }) => <Heart size={18} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart/index"
        options={{
          title: "Cart",
          tabBarIcon: ({ color }) => <ShoppingCart size={18} color={color} />,
        }}
      />

      {/* Hidden routes */}
      <Tabs.Screen
        name="product/[id]/index"
        options={{
          href: null, // hides from tab bar
        }}
      />
      <Tabs.Screen
        name="orders/[id]/index"
        options={{
          href: null
        }}
      />

      <Tabs.Screen
        name="checkout/index"
        options={{
          href: null, // hides from tab bar
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: "Products",
          tabBarIcon: ({ color }) => <ShoppingBasket size={18} color={color} />,
        }}
      />
    </Tabs>
  );
}
