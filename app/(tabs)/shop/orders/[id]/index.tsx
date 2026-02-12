// app/(tabs)/shop/orders/[id].tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  View,
  ScrollView
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import api from "@/lib/api";
import { AppHeader } from "@/components/AppHeader";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  FileText,
  MapPin,
  Package,
  RefreshCcw,
  Truck,
  X,
} from "lucide-react-native";

/* ================= Config ================= */
const AWS_URL = process.env.EXPO_PUBLIC_AWS_URL || "";

/* ================= Types ================= */
type RawItem = {
  _id?: string;
  productId?: string | Record<string, any>;
  variantId?: string | Record<string, any>;
  name?: string;
  price?: number;
  quantity?: number;
  variant?: {
    images?: string[];
    name?: string;
    price?: number;
  };
  // we will attach this after enrichment
  product?: any;
};

type RawOrder = {
  _id: string;
  items?: RawItem[];
  totalAmount?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  shippingAddress?: Record<string, any>;
  paymentType?: string;
  paymentStatus?: string;
  deliveryRate?: number;
  freeShipping?: boolean;
};

/* ================= Constants ================= */
const STATUS_FLOW = [
  "pending",
  "confirmed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
];

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

function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function normalizeOrderStatus(status?: string) {
  return String(status || "pending").toLowerCase();
}

function isCancellableStatus(status?: string) {
  const s = normalizeOrderStatus(status);
  return !["shipped", "out_for_delivery", "delivered", "cancelled"].includes(s);
}

/* ================= UI Primitives ================= */
function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={`rounded-[28px] border border-gray-200 bg-white p-4 ${className}`}>
      {children}
    </View>
  );
}

function SectionTitle({
  icon,
  title,
  right,
}: {
  icon: React.ReactNode;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-2">
        <View className="h-10 w-10 rounded-2xl bg-gray-100 border border-gray-200 items-center justify-center">
          {icon}
        </View>
        <Text className="font-heading2 text-lg text-gray-900">{title}</Text>
      </View>

      {!!right && <View>{right}</View>}
    </View>
  );
}

function Pill({
  text,
  tone,
}: {
  text: string;
  tone: "green" | "red" | "gray" | "blue" | "yellow";
}) {
  const map = {
    green: "bg-green-50 border-green-200 text-green-700",
    red: "bg-red-50 border-red-200 text-red-700",
    gray: "bg-gray-50 border-gray-200 text-gray-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-700",
  } as const;

  return (
    <View className={`px-3 py-1 rounded-full border ${map[tone]}`}>
      <Text className="font-sans text-[11px] font-extrabold">{text}</Text>
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
      disabled={disabled}
      onPress={onPress}
      className={`h-12 rounded-2xl flex-row items-center justify-center gap-2 ${
        disabled ? "bg-gray-200" : "bg-primary"
      }`}
    >
      {icon}
      <Text
        className={`font-sans text-sm font-extrabold ${
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
  danger,
}: {
  text: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={`h-12 rounded-2xl border flex-row items-center justify-center gap-2 ${
        disabled ? "border-gray-200 bg-gray-100" : "border-gray-200 bg-white"
      }`}
    >
      {icon}
      <Text
        className={`font-sans text-sm font-extrabold ${
          danger ? "text-red-700" : "text-gray-900"
        }`}
      >
        {text}
      </Text>
    </Pressable>
  );
}

/* ================= Status Badge ================= */
function StatusBadge({ status }: { status?: string }) {
  const s = normalizeOrderStatus(status);

  if (s === "delivered") return <Pill tone="green" text="Delivered" />;
  if (s === "cancelled") return <Pill tone="red" text="Cancelled" />;
  if (s === "pending") return <Pill tone="gray" text="Pending" />;
  if (s === "confirmed") return <Pill tone="blue" text="Confirmed" />;
  if (s === "packed") return <Pill tone="yellow" text="Packed" />;
  if (s === "shipped") return <Pill tone="blue" text="Shipped" />;
  if (s === "out_for_delivery") return <Pill tone="blue" text="Out for delivery" />;

  return <Pill tone="gray" text={s.replace(/_/g, " ")} />;
}

function ProgressStepper({ status }: { status?: string }) {
  const current = normalizeOrderStatus(status);

  if (current === "cancelled") {
    return (
      <View className="flex-row items-center gap-3">
        <View className="h-8 w-8 rounded-full bg-red-600 items-center justify-center">
          <X size={16} color="#fff" />
        </View>
        <Text className="font-sans text-sm font-extrabold text-red-700">
          Cancelled
        </Text>
      </View>
    );
  }

  const idx = Math.max(0, STATUS_FLOW.indexOf(current));

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingRight: 6,
        paddingVertical: 2,
        alignItems: "center",
      }}
    >
      {STATUS_FLOW.map((s, i) => {
        const achieved = i <= idx;
        const isLast = i === STATUS_FLOW.length - 1;

        return (
          <View key={s} className="flex-row items-center">
            <View className="items-center">
              <View
                className={`h-9 w-9 rounded-full items-center justify-center border ${
                  achieved
                    ? "bg-green-600 border-green-600"
                    : "bg-gray-100 border-gray-200"
                }`}
              >
                {achieved ? (
                  <Check size={16} color="#fff" />
                ) : (
                  <Text className="font-sans text-xs font-extrabold text-gray-600">
                    {i + 1}
                  </Text>
                )}
              </View>

              <Text
                className="mt-2 font-sans text-[10px] font-extrabold text-gray-500"
                numberOfLines={1}
              >
                {s.replace(/_/g, " ").toUpperCase()}
              </Text>
            </View>

            {!isLast && (
              <View
                className={`mx-2 h-[2px] w-8 rounded-full ${
                  i < idx ? "bg-green-400" : "bg-gray-200"
                }`}
              />
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

/* ========================================================= */
export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [order, setOrder] = useState<RawOrder | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cancelling, setCancelling] = useState(false);
  const [reordering, setReordering] = useState(false);

  /* ---------------- Fetch order ---------------- */
  const fetchOrder = useCallback(
    async (orderId: string) => {
      setLoading(true);
      setError(null);

      try {
        const res = await api.get(`/orders/${orderId}`);
        const payload = res.data?.data ?? res.data ?? null;

        if (!payload) {
          setOrder(null);
          setError("Order not found");
          return;
        }

        const o: RawOrder = payload?.order ?? payload;
        const items = Array.isArray(o.items) ? o.items : [];

        // If items have productId as string, fetch product details
        const idsToFetch = new Set<string>();
        for (const it of items) {
          if (typeof it.productId === "string") idsToFetch.add(it.productId);
        }

        const productCache: Record<string, any> = {};
        if (idsToFetch.size > 0) {
          setLoadingProducts(true);

          await Promise.all(
            Array.from(idsToFetch).map(async (pid) => {
              try {
                const pRes = await api.get(`/products/${pid}`);
                const pPayload = pRes.data?.data ?? pRes.data ?? null;
                productCache[pid] = pPayload?.product ?? pPayload;
              } catch {
                productCache[pid] = null;
              }
            })
          );

          setLoadingProducts(false);
        }

        const enrichedItems = items.map((it) => {
          let product: any = null;

          if (typeof it.productId === "string") product = productCache[it.productId];
          else if (it.productId && typeof it.productId === "object") product = it.productId;

          return { ...it, product };
        });

        setOrder({ ...o, items: enrichedItems });
      } catch (e: any) {
        console.log("fetchOrder error", e);
        setOrder(null);
        setError(e?.response?.data?.message || "Failed to load order");
      } finally {
        setLoading(false);
      }
    },
    [setOrder]
  );

  useEffect(() => {
    if (!id) return;
    fetchOrder(String(id));
  }, [id, fetchOrder]);

  const onRefresh = useCallback(async () => {
    if (!id) return;
    try {
      setRefreshing(true);
      await fetchOrder(String(id));
    } finally {
      setRefreshing(false);
    }
  }, [id, fetchOrder]);

  /* ---------------- Pricing ---------------- */
  const subtotal = useMemo(() => {
    if (!order?.items) return 0;
    return order.items.reduce(
      (s, it) => s + Number(it.price ?? 0) * Number(it.quantity ?? 0),
      0
    );
  }, [order]);

  const delivery = useMemo(() => {
    if (!order) return 0;
    if (order.freeShipping) return 0;
    return Number(order.deliveryRate ?? 0);
  }, [order]);

  const taxes = useMemo(() => {
    // NOTE: Your web version shows a fake 18% "taxes" line.
    // Keeping same behavior so UI matches.
    return Math.round((subtotal + delivery) * 0.18);
  }, [subtotal, delivery]);

  const total = useMemo(() => {
    if (!order) return subtotal + delivery;
    return Number(order.totalAmount ?? subtotal + delivery);
  }, [order, subtotal, delivery]);

  /* ---------------- Actions ---------------- */
  const cancelOrder = useCallback(async () => {
    if (!order?._id) return;

    Alert.alert(
      "Cancel order?",
      "This action may not be reversible.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, cancel",
          style: "destructive",
          onPress: async () => {
            setCancelling(true);

            const prev = order;
            setOrder({
              ...order,
              status: "cancelled",
              updatedAt: new Date().toISOString(),
            });

            try {
              await api.patch(`/orders/${order._id}/cancel`);
              Alert.alert("Cancelled", "Order cancelled successfully.");
            } catch (e: any) {
              console.log("cancelOrder error", e);
              setOrder(prev);
              Alert.alert(
                "Failed",
                e?.response?.data?.message || "Could not cancel order."
              );
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  }, [order]);

  const handleReorder = useCallback(async () => {
    if (!order?._id) return;

    Alert.alert(
      "Reorder this order?",
      "This will add all items from this order back into your cart.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reorder",
          style: "default",
          onPress: async () => {
            setReordering(true);
            try {
              await api.post(`/orders/reorder/${order._id}`);
              Alert.alert("Added", "Items added to cart.");
              router.push("/(tabs)/shop/cart" as any);
            } catch (e: any) {
              console.log("reorder error", e);
              Alert.alert("Failed", "Could not reorder.");
            } finally {
              setReordering(false);
            }
          },
        },
      ]
    );
  }, [order]);

  /* ================= Loading / Error ================= */
  if (loading) {
    return (
      <View className="flex-1 bg-background">
        <AppHeader />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-background">
        <AppHeader />
        <View className="px-4 pt-6">
          <Card>
            <View className="flex-row items-center gap-2">
              <View className="h-10 w-10 rounded-2xl bg-red-50 border border-red-200 items-center justify-center">
                <X size={18} color="#dc2626" />
              </View>
              <View className="flex-1">
                <Text className="font-heading2 text-lg text-gray-900">
                  Something went wrong
                </Text>
                <Text className="mt-1 font-sans text-sm text-gray-600">
                  {error}
                </Text>
              </View>
            </View>

            <View className="mt-4 flex-row gap-3">
              <View className="flex-1">
                <SecondaryButton
                  text="Go back"
                  onPress={() => router.back()}
                  icon={<ArrowLeft size={16} color="#0f172a" />}
                />
              </View>

              <View className="flex-1">
                <PrimaryButton
                  text="Retry"
                  onPress={() => id && fetchOrder(String(id))}
                  icon={<RefreshCcw size={16} color="#fff" />}
                />
              </View>
            </View>
          </Card>
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View className="flex-1 bg-background">
        <AppHeader />
        <View className="px-4 pt-6">
          <Card>
            <Text className="font-heading2 text-lg text-gray-900">
              Order not found
            </Text>
            <Text className="mt-1 font-sans text-sm text-gray-600">
              This order doesn’t exist or you don’t have access.
            </Text>

            <View className="mt-4">
              <SecondaryButton
                text="Back"
                onPress={() => router.back()}
                icon={<ArrowLeft size={16} color="#0f172a" />}
              />
            </View>
          </Card>
        </View>
      </View>
    );
  }

  /* ================= Derived UI ================= */
  const shortId = String(order._id).slice(-8).toUpperCase();
  const placedAt = formatDate(order.createdAt);
  const lastUpdated = formatDate(order.updatedAt);

  const paymentType =
    order.paymentType === "Razorpay"
      ? "Prepaid"
      : order.paymentType
      ? "Pay on Delivery"
      : "—";

  const paymentStatus = order.paymentStatus ?? "—";

  const shipping = order.shippingAddress || {};
  const city = shipping?.city ?? "—";

  const cancellable = isCancellableStatus(order.status);

  /* ================= Render Item Row ================= */
  const renderItem = ({ item, index }: { item: RawItem; index: number }) => {
    const product = (item as any).product ?? null;

    const imgKey =
      item?.variant?.images?.[0] ||
      product?.images?.[0] ||
      product?.variants?.[0]?.images?.[0] ||
      "";

    const imgUrl = resolveImg(imgKey);

    const title = product?.name ?? item.name ?? `Item ${index + 1}`;
    const variantName = item?.variant?.name || "";

    const qty = Number(item.quantity ?? 1);
    const unitPrice = Number(item.price ?? item.variant?.price ?? 0);

    return (
      <View className="px-4 py-4 flex-row items-center gap-4 border-b border-gray-100">
        <View className="h-20 w-20 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
          {imgUrl ? (
            <Image
              source={{ uri: imgUrl }}
              resizeMode="cover"
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Package size={18} color="#94a3b8" />
            </View>
          )}
        </View>

        <View className="flex-1">
          <Text className="font-sans text-sm font-extrabold text-gray-900" numberOfLines={2}>
            {title}
          </Text>

          {!!variantName && (
            <Text className="mt-1 font-sans text-xs font-semibold text-gray-500" numberOfLines={1}>
              {variantName}
            </Text>
          )}

          <Text className="mt-2 font-sans text-xs text-gray-500">
            Qty: <Text className="font-extrabold text-gray-700">{qty}</Text>
          </Text>
        </View>

        <View className="items-end">
          <Text className="font-sans text-xs text-gray-500">
            {formatCurrency(unitPrice)}
          </Text>
          <Text className="mt-1 font-sans text-sm font-extrabold text-gray-900">
            {formatCurrency(unitPrice * qty)}
          </Text>
        </View>
      </View>
    );
  };

  /* ================= Screen ================= */
  return (
    <View className="flex-1 bg-background">
      <AppHeader />

      <FlatList
        data={order.items || []}
        keyExtractor={(it, idx) => String(it._id ?? idx)}
        renderItem={({ item, index }) => renderItem({ item, index })}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 140,
          paddingTop: 12,
        }}
        ListHeaderComponent={
          <View className="px-4">
            {/* Header */}
            <View className="pt-4 flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="font-heading1 text-2xl text-gray-900">
                  Order #{shortId}
                </Text>
                <Text className="mt-1 font-sans text-sm text-gray-500">
                  Placed {placedAt} • Updated {lastUpdated}
                </Text>
              </View>

              <Pressable
                onPress={() => router.back()}
                className="h-10 px-4 rounded-2xl border border-gray-200 bg-white flex-row items-center gap-2"
              >
                <ArrowLeft size={16} color="#0f172a" />
                <Text className="font-sans text-sm font-extrabold text-gray-900">
                  Back
                </Text>
              </Pressable>
            </View>

            {!!loadingProducts && (
              <View className="mt-3 flex-row items-center gap-2">
                <ActivityIndicator />
                <Text className="font-sans text-xs text-gray-500">
                  Loading product details...
                </Text>
              </View>
            )}

            {/* Items card wrapper title */}
            <View className="mt-5">
              <Card>
                <SectionTitle
                  icon={<FileText size={18} color="#0f172a" />}
                  title="Items"
                  right={<Pill tone="gray" text={`${order.items?.length ?? 0} items`} />}
                />

                <View className="mt-3 h-[1px] bg-gray-100" />
                {/* Items will render below as list rows */}
              </Card>
            </View>

            {/* Delivery & status */}
            <View className="mt-4">
              <Card>
                <SectionTitle
                  icon={<Truck size={18} color="#0f172a" />}
                  title="Delivery & status"
                  right={<StatusBadge status={order.status} />}
                />

                <View className="mt-4">
                  <ProgressStepper status={order.status} />
                </View>
              </Card>
            </View>

            {/* Shipping */}
            <View className="mt-4">
              <Card>
                <SectionTitle
                  icon={<MapPin size={18} color="#0f172a" />}
                  title="Shipping address"
                />

                <View className="mt-4 gap-1">
                  <Text className="font-sans text-sm font-extrabold text-gray-900">
                    {shipping?.name ?? "—"}
                  </Text>

                  <Text className="font-sans text-sm text-gray-700">
                    {shipping?.phone ?? "—"}
                  </Text>

                  <Text className="mt-2 font-sans text-sm text-gray-700">
                    {shipping?.street ?? "—"}
                    {!!shipping?.streetOptional ? `, ${shipping.streetOptional}` : ""}
                  </Text>

                  <Text className="font-sans text-sm text-gray-700">
                    {shipping?.city ?? "—"}, {shipping?.state ?? "—"}{" "}
                    {shipping?.zipcode ?? ""}
                  </Text>

                  <Text className="font-sans text-sm text-gray-700">
                    {shipping?.country ?? "—"}
                  </Text>

                  <Text className="mt-3 font-sans text-xs text-gray-500">
                    Delivery city:{" "}
                    <Text className="font-extrabold text-gray-700">{city}</Text>
                  </Text>
                </View>
              </Card>
            </View>

            {/* Payment */}
            <View className="mt-4">
              <Card>
                <SectionTitle
                  icon={<FileText size={18} color="#0f172a" />}
                  title="Payment"
                />

                <View className="mt-4 gap-2">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-sans text-sm text-gray-600">Method</Text>
                    <Text className="font-sans text-sm font-extrabold text-gray-900">
                      {paymentType}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <Text className="font-sans text-sm text-gray-600">
                      Payment status
                    </Text>
                    <Text className="font-sans text-sm font-extrabold text-gray-900">
                      {paymentStatus}
                    </Text>
                  </View>
                </View>
              </Card>
            </View>

            {/* Summary */}
            <View className="mt-4">
              <Card>
                <SectionTitle
                  icon={<FileText size={18} color="#0f172a" />}
                  title="Order summary"
                />

                <View className="mt-4 gap-2">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-sans text-sm text-gray-600">
                      Subtotal
                    </Text>
                    <Text className="font-sans text-sm font-extrabold text-gray-900">
                      {formatCurrency(subtotal)}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <Text className="font-sans text-sm text-gray-600">
                      Delivery
                    </Text>
                    <Text className="font-sans text-sm font-extrabold text-gray-900">
                      {order.freeShipping ? "Free" : formatCurrency(delivery)}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <Text className="font-sans text-sm text-gray-600">Taxes</Text>
                    <Text className="font-sans text-sm font-extrabold text-gray-900">
                      {formatCurrency(taxes)}
                    </Text>
                  </View>

                  <View className="mt-2 border-t border-gray-200 pt-3 flex-row items-center justify-between">
                    <Text className="font-sans text-base font-extrabold text-gray-900">
                      Total
                    </Text>
                    <Text className="font-sans text-xl font-extrabold text-gray-900">
                      {formatCurrency(total)}
                    </Text>
                  </View>

                  <Text className="mt-2 font-sans text-xs text-gray-500">
                    Order ID:{" "}
                    <Text className="font-mono text-xs text-gray-700">
                      {order._id}
                    </Text>
                  </Text>
                </View>
              </Card>
            </View>

            {/* Spacer so first list item doesn't touch the card border */}
            <View className="h-10" />
          </View>
        }
        ListFooterComponent={<View className="h-24" />}
      />

      {/* Sticky actions bottom */}
      <View className="absolute bottom-0 left-0 right-0 px-4 pb-5">
        <View className="rounded-[28px] border border-gray-200 bg-white p-3">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <PrimaryButton
                disabled={reordering || cancelling}
                onPress={handleReorder}
                icon={
                  reordering ? (
                    <ActivityIndicator />
                  ) : (
                    <RefreshCcw size={16} color="#fff" />
                  )
                }
                text={reordering ? "Reordering..." : "Reorder"}
              />
            </View>

            <View className="flex-1">
              <SecondaryButton
                danger
                disabled={!cancellable || cancelling || reordering}
                onPress={cancelOrder}
                icon={<X size={16} color={cancellable ? "#b91c1c" : "#94a3b8"} />}
                text={
                  !cancellable
                    ? "Cannot cancel"
                    : cancelling
                    ? "Cancelling..."
                    : "Cancel"
                }
              />
            </View>
          </View>

          {!cancellable && (
            <Text className="mt-2 font-sans text-[11px] text-gray-500 text-center">
              Cancellation is disabled once the order is shipped.
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
