import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";

import api from "@/lib/api";
import { AppHeader } from "@/components/AppHeader";
import { useAuthStore } from "@/lib/store/auth";


import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Package,
  ArrowRight,
  Truck,
  RefreshCw,
  X,
} from "lucide-react-native";

/* ---------------- Types (same loosened approach) ---------------- */
type Variant = {
  _id?: string;
  name?: string;
  price?: number;
  cutoffPrice?: number;
  stock?: number;
  images?: string[];
};

type Category = {
  _id?: string;
  name?: string;
};

type ProductRef = {
  _id?: string;
  name?: string;
  images?: string[];
  variants?: Variant[];
  selectedVariant?: Variant;
  category?: Category;
};

type CartItem = {
  _id?: string; // server cart item id
  productId?: ProductRef | string;
  variantId?: Variant | string;
  quantity: number;
  price: number;
  [k: string]: any;
};

type Cart = { _id?: string; userId?: string; items: CartItem[] } | null;

/* ---------------- Config ---------------- */
const AWS_URL = process.env.EXPO_PUBLIC_AWS_URL || "";

/* ---------------- Helpers ---------------- */
function isString(x: unknown): x is string {
  return typeof x === "string";
}

function getProductFromItem(item: CartItem): ProductRef | undefined {
  const p = (item as any).product ?? item.productId;
  if (!p) return undefined;
  return isString(p) ? undefined : (p as ProductRef);
}

function getVariantFromItem(item: CartItem): Variant | undefined {
  if (!item) return undefined;
  if (item.variantId && !isString(item.variantId)) return item.variantId as Variant;
  return undefined;
}

function getServerCartItemId(item: CartItem): string | undefined {
  return item._id;
}

function resolveVariantIdForApi(item: CartItem): string | undefined {
  const variant = getVariantFromItem(item);
  if (variant?._id) return variant._id;
  if (item.variantId && isString(item.variantId)) return item.variantId;
  return undefined;
}

function getRenderKey(item: CartItem, idx: number) {
  if (item._id) return item._id;
  const product = getProductFromItem(item);
  const variant = getVariantFromItem(item);
  return `${product?._id ?? "product"}-${variant?._id ?? "variant"}-${idx}`;
}

function resolveImg(path?: string) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!AWS_URL) return path;
  return `${AWS_URL}/${path.replace(/^\//, "")}`;
}

function formatCurrency(n?: number) {
  if (typeof n !== "number") return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

/* ---------------- UI ---------------- */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-3xl border border-gray-200 bg-white p-4">
      {children}
    </View>
  );
}

function IconBadge({
  icon,
  tone = "gray",
}: {
  icon: React.ReactNode;
  tone?: "gray" | "primary" | "green" | "red";
}) {
  const cls =
    tone === "primary"
      ? "bg-primary/10 border-primary/15"
      : tone === "green"
        ? "bg-green-50 border-green-200"
        : tone === "red"
          ? "bg-red-50 border-red-200"
          : "bg-gray-100 border-gray-200";

  return (
    <View
      className={`h-10 w-10 rounded-2xl border items-center justify-center ${cls}`}
    >
      {icon}
    </View>
  );
}

function SnackBar({
  snack,
  onClose,
}: {
  snack: null | { text: string; tone?: "success" | "error" | "info" };
  onClose: () => void;
}) {
  if (!snack) return null;

  const cls =
    snack.tone === "success"
      ? "border-green-200 bg-green-50"
      : snack.tone === "error"
        ? "border-red-200 bg-red-50"
        : "border-gray-200 bg-white";

  const textCls =
    snack.tone === "success"
      ? "text-green-800"
      : snack.tone === "error"
        ? "text-red-800"
        : "text-gray-900";

  return (
    <View className="absolute bottom-6 left-4 right-4">
      <View
        className={`flex-row items-center justify-between rounded-2xl border px-4 py-3 shadow-xl ${cls}`}
      >
        <Text
          className={`flex-1 pr-3 font-sans font-extrabold ${textCls}`}
          numberOfLines={2}
        >
          {snack.text}
        </Text>

        <Pressable onPress={onClose} hitSlop={10}>
          <X size={18} color="#6B7280" />
        </Pressable>
      </View>
    </View>
  );
}

/* ========================================================= */
export default function CartScreen() {
  const { isAuthenticated } = useAuthStore();

  const [cart, setCart] = useState<Cart>(null);
  const [shipping, setShipping] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // actionLoading = cartItemId | "clear"
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // snack
  const [snack, setSnack] = useState<null | {
    text: string;
    tone?: "success" | "error" | "info";
  }>(null);

  const snackTimer = useRef<any>(null);
  const showSnack = (text: string, tone: "success" | "error" | "info" = "info") => {
    setSnack({ text, tone });
    if (snackTimer.current) clearTimeout(snackTimer.current);
    snackTimer.current = setTimeout(() => setSnack(null), 1800);
  };

  /* ---------------- Fetch shipping ---------------- */
  const fetchShipping = useCallback(async () => {
    try {
      const res = await api.get("/shipping");
      const cost = res.data?.cost ?? 0;
      setShipping(Number(cost) || 0);
    } catch (e) {
      console.log("shipping error", e);
      setShipping(0);
    }
  }, []);

  /* ---------------- Fetch cart ---------------- */
  const fetchCart = useCallback(async () => {
    setLoading(true);
    try {
      if (isAuthenticated) {
        const res = await api.get("/cart");
        const data = res.data?.data ?? res.data ?? null;
        setCart(data);
      } 
    } catch (err: any) {
      console.error("fetchCart error", err);
      setCart({ items: [] });
      showSnack("Failed to load cart", "error");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  /* ---------------- Init ---------------- */
  useEffect(() => {
    fetchShipping();
    fetchCart();
  }, [fetchShipping, fetchCart]);

  /* ---------------- Pull to refresh ---------------- */
  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchShipping();
      await fetchCart();
    } finally {
      setRefreshing(false);
    }
  }, [fetchShipping, fetchCart]);

  /* ---------------- Derived totals ---------------- */
  const subtotalSnapshot = useMemo(() => {
    return (
      cart?.items?.reduce(
        (s, it) => s + (it.price || 0) * (it.quantity || 0),
        0
      ) ?? 0
    );
  }, [cart]);

  const subtotalLive = useMemo(() => {
    return (
      cart?.items?.reduce((s, it) => {
        const v = getVariantFromItem(it);
        return s + ((v?.price ?? it.price) || 0) * (it.quantity || 0);
      }, 0) ?? 0
    );
  }, [cart]);

  const totalLive = useMemo(() => {
    return subtotalLive + (shipping || 0);
  }, [subtotalLive, shipping]);

  /* ---------------- Actions ---------------- */
  async function updateQuantity(item: CartItem, newQty: number) {
    if (newQty < 1) return;

    if (isAuthenticated) {
      const serverItemId = getServerCartItemId(item);
      if (!serverItemId) return;

      setActionLoading(String(serverItemId));
      try {
        await api.patch(`/cart/items/${serverItemId}`, {
          quantity: newQty,
          variantId: resolveVariantIdForApi(item),
        });
        await fetchCart();
      } catch (err) {
        console.error("updateQuantity error", err);
        showSnack("Failed to update quantity", "error");
      } finally {
        setActionLoading(null);
      }
    } else {
      const productId = (item.productId as any)?._id || (item.productId as string);
      const variantId = resolveVariantIdForApi(item)!;

      await fetchCart();
    }
  }

  async function removeItem(item: CartItem) {
    if (isAuthenticated) {
      const serverItemId = getServerCartItemId(item);
      if (!serverItemId) return;

      setActionLoading(String(serverItemId));
      try {
        await api.delete(`/cart/items/${serverItemId}`);
        await fetchCart();
      } catch (err) {
        console.error("removeItem error", err);
        showSnack("Failed to remove item", "error");
      } finally {
        setActionLoading(null);
      }
    } else {
      const productId = (item.productId as any)?._id || (item.productId as string);
      const variantId = resolveVariantIdForApi(item)!;

      await fetchCart();
    }
  }

  async function clearCartHandler() {
    Alert.alert("Clear cart", "Clear all items from cart?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          if (isAuthenticated) {
            setActionLoading("clear");
            try {
              await api.delete(`/cart`);
              await fetchCart();
              showSnack("Cart cleared", "success");
            } catch {
              showSnack("Failed to clear cart", "error");
            } finally {
              setActionLoading(null);
            }
          } else {
            await fetchCart();
            showSnack("Cart cleared", "success");
          }
        },
      },
    ]);
  }

  /* ---------------- Loading skeleton ---------------- */
  if (loading) {
    return (
      <View className="flex-1 bg-background">
        <AppHeader />

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
          <View className="px-4 pt-5 gap-4">
            <View className="h-12 rounded-2xl bg-gray-200" />
            {Array.from({ length: 3 }).map((_, i) => (
              <View key={i} className="h-32 rounded-3xl bg-gray-200" />
            ))}
            <View className="h-56 rounded-3xl bg-gray-200" />
          </View>
        </ScrollView>
      </View>
    );
  }

  const items = cart?.items || [];
  const empty = items.length === 0;

  /* ========================================================= */
  return (
    <View className="flex-1 bg-background">
      <AppHeader />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 160 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View className="px-4 pt-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <IconBadge
                tone="primary"
                icon={<ShoppingCart size={18} color="#2563eb" />}
              />
              <View>
                <Text className="font-heading1 text-2xl text-gray-900">
                  Shopping Cart
                </Text>
                <Text className="mt-1 font-sans text-sm text-gray-500">
                  {empty ? "No items added yet" : `${items.length} item(s)`}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={clearCartHandler}
              disabled={actionLoading === "clear" || empty}
              className={`h-11 px-4 rounded-2xl flex-row items-center justify-center gap-2 ${
                empty ? "bg-gray-200" : "bg-gray-100"
              }`}
            >
              {actionLoading === "clear" ? (
                <ActivityIndicator />
              ) : (
                <Trash2 size={16} color="#0f172a" />
              )}
              <Text className="font-sans text-sm text-gray-900">
                Clear
              </Text>
            </Pressable>
          </View>

          {/* Continue shopping */}
          <Pressable
            onPress={() => router.push("/shop" as any)}
            className="mt-4 h-12 rounded-3xl border border-gray-200 bg-white flex-row items-center justify-center gap-2"
          >
            <Text className="font-sans text-sm text-gray-900">
              Continue shopping
            </Text>
            <ArrowRight size={16} color="#0f172a" />
          </Pressable>
        </View>

        {/* Empty state */}
        {empty ? (
          <View className="px-4 mt-6">
            <Card>
              <View className="items-center py-10">
                <View className="h-14 w-14 rounded-3xl bg-gray-100 items-center justify-center border border-gray-200">
                  <Package size={24} color="#64748b" />
                </View>

                <Text className="mt-4 font-heading2 text-lg text-gray-900">
                  Your cart is empty
                </Text>
                <Text className="mt-1 font-sans text-sm text-gray-500 text-center">
                  Add a few school essentials and they’ll show up here.
                </Text>

                <Pressable
                  onPress={() => router.push("/shop/products" as any)}
                  className="mt-5 h-12 px-5 rounded-3xl bg-primary items-center justify-center"
                >
                  <Text className="font-sans text-sm text-white">
                    View Products
                  </Text>
                </Pressable>
              </View>
            </Card>
          </View>
        ) : (
          <>
            {/* Items */}
            <View className="px-4 mt-6 gap-3">
              {items.map((item, idx) => {
                const product = getProductFromItem(item);
                const variant = getVariantFromItem(item);

                const renderKey = getRenderKey(item, idx);
                const serverItemId = getServerCartItemId(item);

                const isBusy = actionLoading !== null && actionLoading !== String(serverItemId);

                const imgKey =
                  variant?.images?.[0] || product?.images?.[0] || "";

                const imgUrl = resolveImg(imgKey);

                const name = product?.name || "Product";
                const categoryName = product?.category?.name;

                const livePrice = variant?.price ?? item.price;
                const stock = variant?.stock ?? 0;

                const showPriceChanged =
                  typeof variant?.price === "number" && item.price !== variant.price;

                return (
                  <Pressable
                    key={renderKey}
                    onPress={() => {
                      if (product?._id) {
                        router.push(`/(tabs)/shop/product/${product._id}` as any);
                      }
                    }}
                    className="border-b border-gray-200 bg-white overflow-hidden"
                  >
                    <View className="flex-row p-1">
                      {/* Image */}
                      <View className="h-24 w-24 rounded-2xl">
                        {imgUrl ? (
                          <Image
                            source={{ uri: imgUrl }}
                            resizeMode="contain"
                            style={{ width: "100%", height: "100%" }}
                          />
                        ) : (
                          <View className="flex-1 items-center justify-center">
                            <Package size={20} color="#94a3b8" />
                          </View>
                        )}
                      </View>

                      {/* Content */}
                      <View className="flex-1 px-3 py-3">
                        {/* name + price */}
                        <View className="flex-row items-start justify-between gap-3">
                          <View className="flex-1">
                            <Text
                              className="font-sans text-sm font-extrabold text-gray-900"
                              numberOfLines={2}
                            >
                              {name}
                            </Text>

                            {!!categoryName && (
                              <Text
                                className="mt-1 font-sans text-xs text-gray-500"
                                numberOfLines={1}
                              >
                                {categoryName}
                              </Text>
                            )}

                            {!!variant?.name && (
                              <Text
                                className="mt-1 font-sans text-xs text-gray-500"
                                numberOfLines={1}
                              >
                                {variant.name}
                              </Text>
                            )}

                            <Text
                              className={`mt-1 font-sans text-xs font-semibold ${
                                stock > 0 ? "text-green-700" : "text-red-700"
                              }`}
                            >
                              {stock > 0 ? `${stock} in stock` : "Out of stock"}
                            </Text>
                          </View>

                          <View className="items-end">
                            {showPriceChanged && (
                              <Text className="font-sans text-xs text-gray-400 line-through">
                                {formatCurrency(item.price)}
                              </Text>
                            )}
                            <Text className="font-sans text-base font-extrabold text-gray-900">
                              {formatCurrency(livePrice)}
                            </Text>
                          </View>
                        </View>

                        {/* qty + remove */}
                        <View className="mt-3 flex-row items-center justify-between">
                          {/* qty controls */}
                          <View className="flex-row items-center rounded-2xl border border-gray-200 overflow-hidden">
                            <Pressable
                              disabled={isBusy || item.quantity <= 1}
                              onPress={() =>
                                updateQuantity(item, Math.max(1, item.quantity - 1))
                              }
                              className={`h-10 w-10 items-center justify-center ${
                                item.quantity <= 1 ? "bg-gray-100" : "bg-gray-50"
                              }`}
                            >
                              <Minus size={16} color="#0f172a" />
                            </Pressable>

                            <View className="h-10 w-12 items-center justify-center bg-white">
                              <Text className="font-sans text-sm font-extrabold text-gray-900">
                                {item.quantity}
                              </Text>
                            </View>

                            <Pressable
                              disabled={isBusy}
                              onPress={() => updateQuantity(item, item.quantity + 1)}
                              className="h-10 w-10 items-center justify-center bg-gray-50"
                            >
                              <Plus size={16} color="#0f172a" />
                            </Pressable>
                          </View>

                          {/* remove */}
                          <Pressable
                            disabled={isBusy}
                            onPress={() => removeItem(item)}
                            className="h-10 px-4 rounded-2xl bg-gray-100 flex-row items-center justify-center gap-2"
                          >
                            {actionLoading === String(serverItemId) ? (
                              <ActivityIndicator />
                            ) : (
                              <Trash2 size={16} color="#0f172a" />
                            )}
                            <Text className="font-sans text-sm font-extrabold text-gray-900">
                              Remove
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Summary */}
            <View className="px-4 mt-6">
              <Card>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <IconBadge
                      tone="gray"
                      icon={<Truck size={18} color="#0f172a" />}
                    />
                    <View>
                      <Text className="font-heading2 text-lg text-gray-900">
                        Order summary
                      </Text>
                      <Text className="mt-1 font-sans text-xs text-gray-500">
                        Final total calculated using current prices
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={fetchCart}
                    className="h-10 w-10 rounded-2xl bg-gray-100 items-center justify-center"
                  >
                    <RefreshCw size={16} color="#0f172a" />
                  </Pressable>
                </View>

                <View className="mt-5 gap-3">
                  <Row label="Subtotal" value={formatCurrency(subtotalLive)} />
                  <Row label="Delivery cost" value={formatCurrency(shipping)} />

                  <View className="border-t border-gray-200 pt-4 flex-row items-center justify-between">
                    <Text className="font-sans text-base font-extrabold text-gray-900">
                      Total
                    </Text>
                    <Text className="font-heading1 text-2xl text-gray-900">
                      {formatCurrency(totalLive)}
                    </Text>
                  </View>
                </View>

                {/* Price changed note */}
                {subtotalSnapshot !== subtotalLive && (
                  <View className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <Text className="font-sans text-xs font-semibold text-amber-800">
                      Prices updated since you added items. Checkout reflects current prices.
                    </Text>
                  </View>
                )}

                {/* Checkout */}
                <View className="mt-4">
                  {isAuthenticated ? (
                    <Pressable
                      disabled={subtotalLive <= 0}
                      onPress={() => router.push("/shop/checkout" as any)}
                      className={`h-14 rounded-3xl flex-row items-center justify-center gap-2 ${
                        subtotalLive <= 0 ? "bg-gray-200" : "bg-primary"
                      }`}
                    >
                      <Text
                        className={`font-sans text-sm font-extrabold ${
                          subtotalLive <= 0 ? "text-gray-600" : "text-white"
                        }`}
                      >
                        Proceed to checkout
                      </Text>
                      <ArrowRight size={18} color={subtotalLive <= 0 ? "#64748b" : "#fff"} />
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => router.push("/auth" as any)}
                      className="h-14 rounded-3xl bg-primary flex-row items-center justify-center gap-2"
                    >
                      <Text className="font-sans text-sm font-extrabold text-white">
                        Sign in to continue
                      </Text>
                      <ArrowRight size={18} color="#fff" />
                    </Pressable>
                  )}
                </View>

                <Text className="mt-3 text-center font-sans text-xs text-gray-500">
                  Prices include GST where applicable.
                </Text>
              </Card>
            </View>
          </>
        )}
      </ScrollView>

      <SnackBar snack={snack} onClose={() => setSnack(null)} />
    </View>
  );
}

/* ---------------- Row ---------------- */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="font-sans text-sm text-gray-600">{label}</Text>
      <Text className="font-sans text-sm font-extrabold text-gray-900">
        {value}
      </Text>
    </View>
  );
}
