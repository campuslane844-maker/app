import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import api from "@/lib/api";
import { AppHeader } from "@/components/AppHeader";
import { useAuthStore } from "@/lib/store/auth";

import {
  ArrowLeft,
  Heart,
  IndianRupee,
  Minus,
  Plus,
  ShoppingCart,
  Package,
} from "lucide-react-native";

/* ---------------- Types ---------------- */
type Variant = {
  _id?: string;
  name: string;
  price: number;
  cutoffPrice?: number;
  stock: number;
  images?: string[];
};

type PopulatedRef = { _id?: string; name?: string } | string | undefined;

type Product = {
  _id: string;
  name: string;
  description?: string;
  category?: PopulatedRef;
  images: string[];
  variants?: Variant[];
  school?: PopulatedRef;
  gender?: string;
  classLevel?: PopulatedRef;
  subject?: string;
  brand?: string;
  type?: string;
};

/* ---------------- Config ---------------- */
const AWS_URL = process.env.EXPO_PUBLIC_AWS_URL || "";

/* ---------------- Helpers ---------------- */
const resolveImg = (v?: string) => {
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  if (!AWS_URL) return v;
  return `${AWS_URL}/${v.replace(/^\//, "")}`;
};

function getRefName(ref?: PopulatedRef) {
  if (!ref) return undefined;
  if (typeof ref === "string") return ref;
  return (ref as any).name || (ref as any)._id || undefined;
}

function formatCurrency(n?: number) {
  if (typeof n !== "number") return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  })
    .format(n)
    .replace("₹", "₹");
}

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

/* ---------------- UI ---------------- */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-3xl border border-gray-200 bg-white p-4">
      {children}
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
          <Text className="font-sans font-extrabold text-gray-500">✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ========================================================= */
export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

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

  useEffect(() => {
    if (!id) return;
    fetchProduct(String(id));
  }, [id]);

  async function fetchProduct(productId: string) {
    setLoading(true);
    setError(null);

    try {
      const res = await api.get(`/products/${productId}`);

      const p: Product | null =
        res.data?.data || res.data?.product || res.data || null;

      if (!p) {
        setError("Product not found");
        setProduct(null);
        return;
      }

      setProduct(p);

      // choose default variant (first in-stock)
      let defaultIndex = 0;
      if (p.variants && p.variants.length > 0) {
        const inStockIndex = p.variants.findIndex((v) => (v.stock ?? 0) > 0);
        defaultIndex = inStockIndex >= 0 ? inStockIndex : 0;
      }

      setSelectedVariantIndex(defaultIndex);
      setQuantity(1);

      const variant = p.variants?.[defaultIndex];
      const img = variant?.images?.[0] || p.images?.[0] || null;
      setMainImage(img);
    } catch (err: any) {
      console.error("fetchProduct error", err);
      setError(
        err?.response?.data?.error?.message ||
          err?.message ||
          "Failed to load product"
      );
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }

  const selectedVariant = useMemo(() => {
    if (!product) return null;
    const arr = product.variants || [];
    return arr[selectedVariantIndex] || arr[0] || null;
  }, [product, selectedVariantIndex]);

  const allImages = useMemo(() => {
    if (!product) return [];
    const vImgs = selectedVariant?.images || [];
    const pImgs = product.images || [];
    return (vImgs.length ? vImgs : pImgs).filter(Boolean);
  }, [product, selectedVariant]);

  const canBuy = (selectedVariant?.stock ?? 0) > 0;

  /* ---------------- Qty ---------------- */
  const incQty = () => {
    const max = selectedVariant?.stock ?? 9999;
    setQuantity((q) => clamp(q + 1, 1, max));
  };

  const decQty = () => {
    setQuantity((q) => clamp(q - 1, 1, 9999));
  };

  const setQtyFromInput = (t: string) => {
    const n = Number(t.replace(/[^0-9]/g, ""));
    if (!n) return setQuantity(1);
    const max = selectedVariant?.stock ?? 9999;
    setQuantity(clamp(n, 1, max));
  };

  /* ---------------- Actions ---------------- */
  const handleAddToCart = async () => {
    if (!product) return;

    if (!selectedVariant) {
      showSnack("Please select a variant before adding to cart.", "info");
      return;
    }

    if ((selectedVariant.stock ?? 0) < 1) {
      showSnack("This variant is out of stock.", "error");
      return;
    }

    if (quantity < 1) {
      showSnack("Please select a valid quantity.", "info");
      return;
    }

    setActionLoading(true);
    try {
      const { isAuthenticated } = useAuthStore.getState();

      if (isAuthenticated) {
        await api.post("/cart/items", {
          productId: product._id,
          variantId: selectedVariant._id,
          quantity,
          price: selectedVariant.price,
        });
      } else {
        
      }

      showSnack("Added to cart", "success");

      setTimeout(() => {
        router.push("/shop/cart" as any);
      }, 600);
    } catch (err: any) {
      console.error("addToCart error", err);
      const message =
        err?.response?.data?.error?.message ||
        "Failed to add to cart. Please try again.";
      showSnack(message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddToWishlist = async () => {
    if (!product) return;

    setWishlistLoading(true);
    try {
      await api.post("/wishlist", { productId: product._id });
      setIsWishlisted(true);
      showSnack("Added to wishlist", "success");
    } catch (err: any) {
      console.error("addToWishlist error", err);
      const message =
        err?.response?.data?.error?.message || "Failed to add to wishlist";
      showSnack(message, "error");
    } finally {
      setWishlistLoading(false);
    }
  };

  /* ---------------- Loading skeleton ---------------- */
  if (loading) {
    return (
      <View className="flex-1 bg-background">
        <AppHeader />

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          <View className="px-4 pt-5 gap-4">
            <View className="h-12 rounded-2xl bg-gray-200" />
            <View className="h-[420px] rounded-3xl bg-gray-200" />
            <View className="h-28 rounded-3xl bg-gray-200" />
            <View className="h-52 rounded-3xl bg-gray-200" />
          </View>
        </ScrollView>
      </View>
    );
  }

  /* ---------------- Error ---------------- */
  if (error) {
    return (
      <View className="flex-1 bg-background">
        <AppHeader />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="font-sans text-sm font-extrabold text-red-700">
            {error}
          </Text>

          <Pressable
            onPress={() => router.back()}
            className="mt-4 rounded-2xl bg-gray-100 px-4 py-3"
          >
            <Text className="font-sans font-extrabold text-gray-900">
              Go back
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!product) {
    return (
      <View className="flex-1 bg-background">
        <AppHeader />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="font-sans text-sm text-gray-700">
            Product not found.
          </Text>
        </View>
      </View>
    );
  }

  /* ========================================================= */
  return (
    <View className="flex-1 bg-background">
      <AppHeader />

      {/* Top bar (Back + breadcrumb) */}
      <View className="px-4 pt-4 pb-3 border-b border-gray-200 bg-white">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="h-11 w-11 rounded-2xl bg-gray-100 items-center justify-center"
          >
            <ArrowLeft size={18} color="#0f172a" />
          </Pressable>

          <View className="flex-1">
            <Text className="font-sans text-xs text-gray-500" numberOfLines={1}>
              {getRefName(product.category) || "Category"} / {product.brand || "Brand"}
            </Text>

            <Text
              className="font-heading2 text-base text-gray-900"
              numberOfLines={1}
            >
              {product.name}
            </Text>
          </View>

          <Pressable
            onPress={handleAddToWishlist}
            disabled={wishlistLoading}
            className="h-11 w-11 rounded-2xl bg-gray-100 items-center justify-center"
          >
            {wishlistLoading ? (
              <ActivityIndicator />
            ) : (
              <Heart size={18} color={isWishlisted ? "#ef4444" : "#334155"} />
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        {/* ================= IMAGES ================= */}
        <View className="px-4 pt-4">
          <View className="rounded-3xl border border-gray-200 bg-white overflow-hidden">
            {/* Main image */}
            <View className="h-[420px] w-full bg-gray-100 items-center justify-center">
              {mainImage ? (
                <Image
                  source={{ uri: resolveImg(mainImage) }}
                  resizeMode="contain"
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <View className="items-center justify-center">
                  <Package size={28} color="#94a3b8" />
                  <Text className="mt-2 font-sans text-sm text-gray-500">
                    No image
                  </Text>
                </View>
              )}
            </View>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  gap: 10,
                }}
              >
                {allImages.map((img, idx) => {
                  const active = img === mainImage;

                  return (
                    <Pressable
                      key={`${img}-${idx}`}
                      onPress={() => setMainImage(img)}
                      className={`h-20 w-20 rounded-2xl overflow-hidden border ${
                        active ? "border-gray-900" : "border-gray-200"
                      }`}
                    >
                      <Image
                        source={{ uri: resolveImg(img) }}
                        resizeMode="cover"
                        style={{ width: "100%", height: "100%" }}
                      />
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>

        {/* ================= PURCHASE CARD ================= */}
        <View className="px-4 mt-4">
          <Card>
            {/* Title */}
            <Text className="font-heading2 text-lg text-gray-900">
              {product.name}
            </Text>

            <Text className="mt-1 font-sans text-sm text-gray-500">
              {product.brand || "—"} • {getRefName(product.category) || "—"}
            </Text>

            {/* Price */}
            <View className="mt-4">
              {selectedVariant ? (
                <View>
                  <View className="flex-row items-center gap-2">
                    <IndianRupee size={18} color="#0f172a" />
                    <Text className="font-heading1 text-3xl text-gray-900">
                      {selectedVariant.price}
                    </Text>
                  </View>

                  {!!selectedVariant.cutoffPrice && (
                    <View className="mt-2 flex-row items-center gap-3">
                      <Text className="font-sans text-sm text-gray-500 line-through">
                        {formatCurrency(selectedVariant.cutoffPrice)}
                      </Text>

                      <Text className="font-sans text-sm font-extrabold text-green-700">
                        Save{" "}
                        {formatCurrency(
                          (selectedVariant.cutoffPrice || 0) -
                            selectedVariant.price
                        )}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <Text className="font-sans text-sm text-gray-600">
                  Price not available
                </Text>
              )}
            </View>

            {/* Variant selector */}
            {!!product.variants?.length && (
              <View className="mt-5">
                <Text className="font-sans text-sm font-extrabold text-gray-900">
                  Variants
                </Text>

                <View className="mt-3 gap-2">
                  {product.variants.map((v, idx) => {
                    const active = idx === selectedVariantIndex;
                    const out = (v.stock ?? 0) < 1;

                    return (
                      <Pressable
                        key={v._id || String(idx)}
                        onPress={() => {
                          setSelectedVariantIndex(idx);
                          setQuantity(1);
                          setMainImage(v.images?.[0] || product.images?.[0] || null);
                        }}
                        className={`rounded-2xl border px-4 py-3 ${
                          active
                            ? "border-primary bg-primary/5"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1 pr-3">
                            <Text
                              className="font-sans text-sm font-extrabold text-gray-900"
                              numberOfLines={1}
                            >
                              {v.name}
                            </Text>

                            <Text className="mt-1 font-sans text-xs text-gray-500">
                              {out ? "Out of stock" : `${v.stock} in stock`}
                            </Text>
                          </View>

                          <View className="flex-row items-center gap-1">
                            <IndianRupee size={14} color="#0f172a" />
                            <Text className="font-sans text-sm font-extrabold text-gray-900">
                              {v.price}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Quantity */}
            <View className="mt-5">
              <Text className="font-sans text-sm font-extrabold text-gray-900">
                Quantity
              </Text>

              <View className="mt-3 flex-row items-center gap-10">
                <View className="flex-row items-center rounded-2xl border border-gray-200 overflow-hidden">
                  <Pressable
                    onPress={decQty}
                    className="h-12 w-12 items-center justify-center bg-gray-50"
                  >
                    <Minus size={18} color="#0f172a" />
                  </Pressable>

                  <View className="h-12 w-16 items-center justify-center bg-white">
                    <TextInput
                      value={String(quantity)}
                      onChangeText={setQtyFromInput}
                      keyboardType="numeric"
                      className="font-sans text-base font-extrabold text-gray-900 text-center w-full"
                    />
                  </View>

                  <Pressable
                    onPress={incQty}
                    className="h-12 w-12 items-center justify-center bg-gray-50"
                  >
                    <Plus size={18} color="#0f172a" />
                  </Pressable>
                </View>

                {selectedVariant && (
                  <Text className="font-sans text-xs text-gray-500">
                    Max: {selectedVariant.stock}
                  </Text>
                )}
              </View>
            </View>

            {/* Add to cart */}
            <View className="mt-6">
              <Pressable
                disabled={actionLoading || !canBuy}
                onPress={handleAddToCart}
                className={`h-14 rounded-3xl flex-row items-center justify-center gap-2 ${
                  !canBuy ? "bg-gray-200" : "bg-primary"
                }`}
              >
                {actionLoading ? (
                  <ActivityIndicator color={canBuy ? "#fff" : "#0f172a"} />
                ) : (
                  <ShoppingCart size={18} color={canBuy ? "#fff" : "#64748b"} />
                )}

                <Text
                  className={`font-sans text-sm font-extrabold ${
                    !canBuy ? "text-gray-600" : "text-white"
                  }`}
                >
                  {canBuy ? "Add to cart" : "Out of stock"}
                </Text>
              </Pressable>
            </View>
          </Card>
        </View>

        {/* ================= DESCRIPTION ================= */}
        <View className="px-4 mt-4">
          <Card>
            <Text className="font-heading2 text-lg text-gray-900">
              Product description
            </Text>

            <Text className="mt-3 font-sans text-sm text-gray-700 leading-6">
              {product.description || "No description available."}
            </Text>
          </Card>
        </View>

        {/* ================= DETAILS ================= */}
        <View className="px-4 mt-4">
          <Card>
            <Text className="font-heading2 text-lg text-gray-900">
              Product details
            </Text>

            <View className="mt-4 gap-3">
              <DetailRow label="Brand" value={product.brand} />
              <DetailRow label="Category" value={getRefName(product.category)} />
              <DetailRow label="Gender" value={product.gender} />
              <DetailRow label="Subject" value={product.subject} />
              <DetailRow label="Class level" value={getRefName(product.classLevel)} />
              <DetailRow label="School" value={getRefName(product.school)} />
              <DetailRow label="Type" value={product.type} />
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* Snackbar */}
      <SnackBar snack={snack} onClose={() => setSnack(null)} />
    </View>
  );
}

/* ---------------- Details row ---------------- */
function DetailRow({ label, value }: { label: string; value?: any }) {
  return (
    <View className="flex-row items-center justify-between border-b border-gray-100 pb-3">
      <Text className="font-sans text-sm font-extrabold text-gray-900">
        {label}
      </Text>
      <Text className="font-sans text-sm text-gray-600" numberOfLines={1}>
        {value || "—"}
      </Text>
    </View>
  );
}
