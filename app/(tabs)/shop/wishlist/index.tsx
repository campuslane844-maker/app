// app/(tabs)/shop/wishlist.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import api from "@/lib/api";
import { AppHeader } from "@/components/AppHeader";
import {
  ArrowRight,
  Heart,
  Search,
  ShoppingCart,
  Sparkles,
  Trash2,
} from "lucide-react-native";

/* ================= Types ================= */
type Variant = {
  _id?: string;
  name?: string;
  price?: number;
  cutoffPrice?: number;
  stock?: number;
  images?: string[];
};

type Product = {
  _id: string;
  name: string;
  description?: string;
  images?: string[];
  variants?: Variant[];
  category?: { _id?: string; name?: string } | string;
  brand?: string;
};

/* ================= Config ================= */
const AWS_URL = process.env.EXPO_PUBLIC_AWS_URL || "";

/* ================= Helpers ================= */
function resolveImg(path?: string) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!AWS_URL) return path;
  return `${AWS_URL}/${path.replace(/^\//, "")}`;
}

function formatCurrency(n?: number) {
  if (typeof n !== "number") return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function pickVariant(product: Product): Variant | undefined {
  const v = product.variants || [];
  if (!v.length) return undefined;
  const inStock = v.find((x) => (x.stock ?? 0) > 0);
  return inStock ?? v[0];
}

/* ================= UI ================= */
function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number;
  sub: string;
  tone?: "pink" | "gray";
}) {
  const isPink = tone === "pink";
  return (
    <View className="flex-1 rounded-3xl border border-gray-200 bg-white p-4">
      <Text className="font-sans text-xs font-extrabold text-gray-500">
        {label}
      </Text>
      <Text className="mt-2 font-heading1 text-2xl text-gray-900">
        {value}
      </Text>
      <Text className="mt-1 font-sans text-sm text-gray-600">{sub}</Text>

      <View
        className={`mt-3 h-1.5 w-16 rounded-full ${
          isPink ? "bg-pink-200" : "bg-gray-200"
        }`}
      />
    </View>
  );
}

function PrimaryButton({
  text,
  onPress,
  disabled,
  icon,
}: {
  text: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`h-11 flex-row items-center justify-center gap-2 rounded-2xl ${
        disabled ? "bg-gray-200" : "bg-primary"
      }`}
    >
      {icon}
      <Text
        className={`font-sans text-sm ${
          disabled ? "text-gray-600" : "text-white"
        }`}
      >
        {text}
      </Text>
    </Pressable>
  );
}

function SecondaryButton({
  text,
  onPress,
  disabled,
  icon,
}: {
  text: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`h-11 flex-row items-center justify-center gap-2 rounded-2xl border ${
        disabled ? "border-gray-200 bg-gray-100" : "border-gray-200 bg-white"
      }`}
    >
      {icon}
      <Text className="font-sans text-sm font-extrabold text-gray-900">
        {text}
      </Text>
    </Pressable>
  );
}

/* ================= Screen ================= */
export default function WishlistScreen() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/wishlist");
      const payload = res.data?.data ?? res.data ?? null;

      let products: Product[] = [];
      if (payload?.products) products = payload.products;
      else if (Array.isArray(payload)) products = payload;

      setItems(products);
    } catch (e) {
      console.log("fetchWishlist error", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchWishlist();
    } finally {
      setRefreshing(false);
    }
  }, [fetchWishlist]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;

    return items.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const brand = (p.brand || "").toLowerCase();
      return name.includes(q) || brand.includes(q);
    });
  }, [items, search]);

  const totalItems = items.length;

  const totalInStock = useMemo(() => {
    return items.reduce((s, p) => {
      const v = pickVariant(p);
      return s + ((v?.stock ?? 0) > 0 ? 1 : 0);
    }, 0);
  }, [items]);

  const totalOutOfStock = totalItems - totalInStock;

  async function handleAddToCart(product: Product) {
    const variant = pickVariant(product);

    if (!variant?._id) return;
    if ((variant.stock ?? 0) < 1) return;

    setActionLoading(product._id);
    try {
      await api.post("/cart/items", {
        productId: product._id,
        variantId: variant._id,
        quantity: 1,
        price: variant.price,
      });

      setTimeout(() => router.push("/(tabs)/shop/cart" as any), 300);
    } catch (e) {
      console.log("addToCart error", e);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRemove(productId: string) {
    setActionLoading(productId);

    // optimistic
    const prev = items;
    setItems((list) => list.filter((p) => p._id !== productId));

    try {
      await api.delete(`/wishlist/${productId}`);
    } catch (e) {
      console.log("removeFromWishlist error", e);
      setItems(prev);
    } finally {
      setActionLoading(null);
    }
  }

  const renderItem = ({ item }: { item: Product }) => {
    const variant = pickVariant(item);

    const imgPath = item.images?.[0] || item.variants?.[0]?.images?.[0] || "";
    const imgUrl = resolveImg(imgPath);

    const stock = variant?.stock ?? 0;
    const price = variant?.price;
    const cutoff = variant?.cutoffPrice;

    const showDiscount =
      typeof cutoff === "number" &&
      typeof price === "number" &&
      cutoff > price;

    const isBusy = actionLoading === item._id;

    return (
      <View className="w-1/2 px-1.5">
        <Pressable
          onPress={() =>
            router.push(`/(tabs)/shop/product/${item._id}` as any)
          }
          className="overflow-hidden rounded-3xl border border-gray-200 bg-white"
        >
          {/* Image */}
          <View className="h-40 w-full bg-gray-100">
            {imgUrl ? (
              <Image
                source={{ uri: imgUrl }}
                resizeMode="cover"
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Sparkles size={20} color="#94a3b8" />
              </View>
            )}

            {/* Stock badge */}
            <View className="absolute left-3 top-3">
              <View
                className={`rounded-full border px-3 py-1 ${
                  stock > 0
                    ? "border-white/60 bg-white/90"
                    : "border-red-600 bg-red-600"
                }`}
              >
                <Text
                  className={`font-sans text-[11px] font-extrabold ${
                    stock > 0 ? "text-gray-900" : "text-white"
                  }`}
                >
                  {stock > 0 ? `${stock} in stock` : "Out of stock"}
                </Text>
              </View>
            </View>

            {/* Wishlisted badge */}
            <View className="absolute right-3 top-3">
              <View className="rounded-full bg-black/70 px-3 py-1">
                <Text className="font-sans text-[11px] font-extrabold text-white">
                  Wishlisted
                </Text>
              </View>
            </View>
          </View>

          {/* Content */}
          <View className="p-4">
            <Text
              className="font-sans text-sm font-extrabold text-gray-900"
              numberOfLines={2}
            >
              {item.name}
            </Text>

            {!!variant?.name && (
              <Text
                className="mt-1 font-sans text-xs font-semibold text-gray-500"
                numberOfLines={1}
              >
                {variant.name}
              </Text>
            )}

            {/* Price */}
            <View className="mt-3">
              <View className="flex-row items-end gap-2">
                <Text className="font-sans text-base font-extrabold text-gray-900">
                  {formatCurrency(price)}
                </Text>

                {showDiscount && (
                  <Text className="font-sans text-xs font-bold text-gray-400 line-through">
                    {formatCurrency(cutoff)}
                  </Text>
                )}
              </View>

              {showDiscount && (
                <Text className="mt-1 font-sans text-xs font-bold text-green-700">
                  Save {formatCurrency((cutoff ?? 0) - (price ?? 0))}
                </Text>
              )}
            </View>

            {/* Actions */}
            <View className="mt-4 gap-2">
              <PrimaryButton
                disabled={isBusy || stock < 1}
                onPress={() => handleAddToCart(item)}
                icon={
                  isBusy ? (
                    <ActivityIndicator />
                  ) : (
                    <ShoppingCart size={16} color="#fff" />
                  )
                }
                text={
                  stock < 1
                    ? "Out of stock"
                    : isBusy
                    ? "Adding..."
                    : "Add to cart"
                }
              />

              <SecondaryButton
                disabled={isBusy}
                onPress={() => handleRemove(item._id)}
                icon={<Trash2 size={16} color="#0f172a" />}
                text="Remove"
              />
            </View>
          </View>
        </Pressable>
      </View>
    );
  };

  /* ================= UI ================= */
  return (
    <View className="flex-1 bg-background">
      <AppHeader />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : filtered.length === 0 ? (
        <View className="flex-1 px-4 pt-10">
          {/* Top header (scroll is irrelevant here, list is empty) */}
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-3xl border border-pink-100 bg-pink-50">
                  <Heart size={18} color="#db2777" />
                </View>

                <View className="flex-1">
                  <Text className="font-heading1 text-2xl text-gray-900">
                    Wishlist
                  </Text>
                  <Text className="mt-1 font-sans text-sm text-gray-500">
                    Saved items you might want to buy later.
                  </Text>
                </View>
              </View>
            </View>

            
          </View>

          <View className="mt-6 items-center rounded-3xl border border-gray-200 bg-white p-8">
            <View className="h-14 w-14 items-center justify-center rounded-3xl border border-gray-200 bg-gray-50">
              <Sparkles size={22} color="#0f172a" />
            </View>

            <Text className="mt-4 font-heading2 text-lg text-gray-900">
              {search ? "No matching items" : "Your wishlist is empty"}
            </Text>

            <Text className="mt-2 text-center font-sans text-sm text-gray-500">
              {search
                ? "Try searching with a different name or brand."
                : "Browse products and tap the heart icon to save them here."}
            </Text>

            <View className="mt-6 w-full">
              <PrimaryButton
                
                text={search ? "Clear search" : "View Products"}
                onPress={() => {
                  if (search) setSearch("");
                  else router.push("/(tabs)/shop" as any);
                }}
              />
            </View>
          </View>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => it._id}
          renderItem={renderItem}
          numColumns={2}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: 14,
            paddingBottom: 120,
            paddingHorizontal: 10,
          }}
          columnWrapperStyle={{
            justifyContent: "space-between",
          }}
          ListHeaderComponent={
            <View className="px-4 pt-2 pb-2">
              {/* Top header */}
              <View className="pt-3 flex-row items-center justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center gap-3">
                    <View className="h-12 w-12 items-center justify-center rounded-3xl border border-pink-100 bg-pink-50">
                      <Heart size={18} color="#db2777" />
                    </View>

                    <View className="flex-1">
                      <Text className="font-heading1 text-2xl text-gray-900">
                        Wishlist
                      </Text>
                      <Text className="mt-1 font-sans text-sm text-gray-500">
                        Saved items you might want to buy later.
                      </Text>
                    </View>
                  </View>
                </View>

                
              </View>

              {/* Search */}
              <View className="mt-4">
                <View className="h-11 flex-row items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3">
                  <Search size={16} color="#94a3b8" />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search by product or brand..."
                    placeholderTextColor="#9CA3AF"
                    className="flex-1 font-sans text-sm text-gray-900"
                  />
                  {!!search && (
                    <Pressable
                      onPress={() => setSearch("")}
                      className="h-9 w-9 items-center justify-center rounded-xl bg-gray-50"
                    >
                      <Text className="font-sans text-lg font-extrabold text-gray-600">
                        ×
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Stats */}
              <View className="mt-4 flex-row gap-3">
                <StatCard
                  label="Saved"
                  value={totalItems}
                  sub="Total wishlist items"
                  tone="pink"
                />
                <StatCard
                  label="Available"
                  value={totalInStock}
                  sub="Ready to add"
                />
                <StatCard
                  label="Out of stock"
                  value={totalOutOfStock}
                  sub="Not available"
                />
              </View>

              <View className="h-4" />
            </View>
          }
        />
      )}
    </View>
  );
}
