import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
  ChevronRight,
  Search,
  X,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
} from "lucide-react-native";

/* =========================================================
   Status Flow
========================================================= */
const STATUS_FLOW = [
  "pending",
  "confirmed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
] as const;

type OrderStatus = (typeof STATUS_FLOW)[number] | "cancelled";

/* =========================================================
   Types
========================================================= */
type ApiOrder = {
  _id: string;
  totalAmount?: number;
  status?: OrderStatus | string;
  createdAt?: string;
  updatedAt?: string;

  items?: Array<{
    _id?: string;
    productId?: {
      _id: string;
      name?: string;
      images?: string[];
      brand?: string;
    } | null;
    variantId?: string;
    quantity?: number;
    price?: number;
    variant?: {
      _id?: string;
      name?: string;
      price?: number;
      images?: string[];
    };
  }>;

  paymentType?: string;
  paymentStatus?: string;
  deliveryRate?: number;
  freeShipping?: boolean;
  shippingAddress?: { city?: string; name?: string; phone?: string };
};

/* =========================================================
   Helpers
========================================================= */
function formatCurrency(amount?: number) {
  if (typeof amount !== "number") return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
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

function normalizeStatus(s?: string): OrderStatus {
  const v = (s || "pending").toLowerCase();
  if (v === "cancelled") return "cancelled";
  if (STATUS_FLOW.includes(v as any)) return v as any;
  return "pending";
}

function humanizeStatus(s?: string) {
  return (s || "pending").replace(/_/g, " ");
}

/* =========================================================
   UI Components
========================================================= */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-[28px] border border-gray-200 bg-white p-4">
      {children}
    </View>
  );
}

function StatusPill({ status }: { status?: string }) {
  const s = normalizeStatus(status);

  const cls =
    s === "delivered"
      ? "bg-green-50 border-green-200"
      : s === "cancelled"
        ? "bg-red-50 border-red-200"
        : s === "pending"
          ? "bg-gray-50 border-gray-200"
          : "bg-white border-gray-200";

  const textCls =
    s === "delivered"
      ? "text-green-800"
      : s === "cancelled"
        ? "text-red-800"
        : "text-gray-700 capitalize";

  return (
    <View className={`rounded-full border px-3 py-1 ${cls}`}>
      <Text className={`font-sans text-xs font-extrabold ${textCls}`}>
        {s === "pending" ? "Pending" : s === "cancelled" ? "Cancelled" : humanizeStatus(s)}
      </Text>
    </View>
  );
}

function PrimaryOutlineButton({
  text,
  onPress,
  icon,
}: {
  text: string;
  onPress: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="h-11 px-4 rounded-2xl border border-gray-200 bg-white flex-row items-center justify-center gap-2"
    >
      <Text className="font-sans text-sm font-extrabold text-gray-900">
        {text}
      </Text>
      {icon}
    </Pressable>
  );
}

function DangerGhostButton({
  text,
  onPress,
  disabled,
}: {
  text: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={`h-11 px-3 rounded-2xl flex-row items-center justify-center ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <Text className="font-sans text-sm font-extrabold text-red-600">
        {text}
      </Text>
    </Pressable>
  );
}

/* =========================================================
   Screen
========================================================= */
export default function OrdersScreen() {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [cancellingIds, setCancellingIds] = useState<string[]>([]);

  const searchRef = useRef<TextInput | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/orders/mine", {
        params: { page: 1, limit: 50 },
      });

      const data = res.data?.data ?? res.data ?? [];
      const normalized = (data as ApiOrder[]).map((o) => ({
        ...o,
        items: Array.isArray(o.items) ? o.items : [],
      }));

      const confirmedOrders = normalized.filter(order => order.status !== 'pending');

      setOrders(confirmedOrders);
    } catch (e) {
      console.error("fetchOrders error", e);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchOrders();
    } finally {
      setRefreshing(false);
    }
  }, [fetchOrders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;

    return orders.filter((o) => {
      if (String(o._id ?? "").toLowerCase().includes(q)) return true;
      if ((o.status ?? "").toLowerCase().includes(q)) return true;
      if ((o.paymentStatus ?? "").toLowerCase().includes(q)) return true;
      if ((o.shippingAddress?.city ?? "").toLowerCase().includes(q)) return true;

      for (const it of o.items ?? []) {
        const name =
          it.variant?.name?.toLowerCase() ||
          (typeof it.productId === "object"
            ? (it.productId?.name ?? "").toLowerCase()
            : "");

        if (name.includes(q)) return true;
      }

      return false;
    });
  }, [orders, search]);

  async function cancelOrder(orderId: string) {
    Alert.alert(
      "Cancel order?",
      "Cancel this order? This action may not be reversible.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, cancel",
          style: "destructive",
          onPress: async () => {
            setCancellingIds((s) => [...s, orderId]);

            // optimistic UI
            const prev = orders;
            setOrders((list) =>
              list.map((o) =>
                o._id === orderId
                  ? { ...o, status: "cancelled", updatedAt: new Date().toISOString() }
                  : o
              )
            );

            try {
              await api.patch(`/orders/${orderId}/cancel`);
            } catch (e: any) {
              console.log("cancel error", e);
              setOrders(prev);
              Alert.alert(
                "Unable to cancel",
                e?.response?.data?.message || "Unable to cancel order."
              );
            } finally {
              setCancellingIds((s) => s.filter((id) => id !== orderId));
            }
          },
        },
      ]
    );
  }

  const renderOrder = ({ item }: { item: ApiOrder }) => {
    const items = item.items ?? [];

    const subtotal =
      typeof item.totalAmount === "number"
        ? item.totalAmount
        : items.reduce(
            (s, it) =>
              s +
              Number(it.price ?? it.variant?.price ?? 0) *
                Number(it.quantity ?? 1),
            0
          );

    const firstItem = items[0] ?? null;

    const firstName =
      firstItem?.variant?.name ||
      (typeof firstItem?.productId === "object"
        ? firstItem.productId?.name
        : null) ||
      `Item (${items.length})`;

    const placedAt = formatDate(item.createdAt);
    const lastUpdated = formatDate(item.updatedAt);

    const shortId = String(item._id ?? "").slice(-8).toUpperCase();

    const city = item.shippingAddress?.city ?? "—";
    const payment = item.paymentType === "Razorpay" ? "Prepaid" : "COD";
    const paymentStatus = item.paymentStatus ?? "—";

    const deliveryRate =
      typeof item.deliveryRate === "number"
        ? formatCurrency(item.deliveryRate)
        : item.freeShipping
          ? "Free"
          : "—";

    const status = normalizeStatus(item.status);

    const isCancellable = ![
      "shipped",
      "out_for_delivery",
      "delivered",
      "cancelled",
    ].includes(status);

    const cancelling = cancellingIds.includes(item._id);

    return (
      <View className="px-4 mb-4">
        <Card>
          {/* Top Row */}
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="font-heading2 text-base text-gray-900">
                  Order #{shortId}
                </Text>
                <Text className="font-sans text-xs text-gray-500">
                  {items.length} item{items.length !== 1 ? "s" : ""}
                </Text>
              </View>

              <View className="mt-2">
                <StatusPill status={status} />
              </View>
            </View>

            <View className="items-end">
              <Text className="font-sans text-xs text-gray-500">Total</Text>
              <Text className="font-sans text-base font-extrabold text-gray-900">
                {formatCurrency(subtotal)}
              </Text>
            </View>
          </View>

          {/* Meta */}
          <View className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-3">
            <View className="flex-row items-center justify-between">
              <Text className="font-sans text-xs text-gray-600">Placed</Text>
              <Text className="font-sans text-xs font-bold text-gray-900">
                {placedAt}
              </Text>
            </View>

            <View className="mt-2 flex-row items-center justify-between">
              <Text className="font-sans text-xs text-gray-600">City</Text>
              <Text className="font-sans text-xs font-bold text-gray-900">
                {city}
              </Text>
            </View>

            <View className="mt-2 flex-row items-center justify-between">
              <Text className="font-sans text-xs text-gray-600">Payment</Text>
              <Text className="font-sans text-xs font-bold text-gray-900">
                {payment}
              </Text>
            </View>

            <View className="mt-2 flex-row items-center justify-between">
              <Text className="font-sans text-xs text-gray-600">
                Pay status
              </Text>
              <Text className="font-sans text-xs font-bold text-gray-900">
                {paymentStatus}
              </Text>
            </View>

            <View className="mt-2 flex-row items-center justify-between">
              <Text className="font-sans text-xs text-gray-600">
                Delivery fee
              </Text>
              <Text className="font-sans text-xs font-bold text-gray-900">
                {deliveryRate}
              </Text>
            </View>
          </View>

          
          {/* Actions */}
          <View className="mt-5 flex-row items-center gap-2">
            <PrimaryOutlineButton
              text="View"
              onPress={() => router.push(`/(tabs)/shop/orders/${item._id}` as any)}
              icon={<ChevronRight size={18} color="#0f172a" />}
            />

            <View className="flex-1" />

            <DangerGhostButton
              text={cancelling ? "Cancelling..." : "Cancel"}
              disabled={!isCancellable || cancelling}
              onPress={() => cancelOrder(item._id)}
            />
          </View>

          {/* Updated */}
          {lastUpdated !== "—" && (
            <Text className="mt-3 font-sans text-xs text-gray-500 text-right">
              Updated: {lastUpdated}
            </Text>
          )}
        </Card>
      </View>
    );
  };

  /* =========================================================
     UI
  ========================================================= */
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

  return (
    <View className="flex-1 bg-background">
      <AppHeader />

      {/* Header */}
      <View className="px-4 pt-5">
        <Text className="font-heading1 text-2xl text-gray-900">My Orders</Text>
        <Text className="mt-1 font-sans text-sm text-gray-500">
          Track delivery progress, payment status and more.
        </Text>
      </View>

      {/* Search */}
      <View className="px-4 mt-4">
        <View className="rounded-3xl border border-gray-200 bg-white px-3 py-3 flex-row items-center gap-3">
          <View className="h-10 w-10 rounded-2xl bg-gray-100 border border-gray-200 items-center justify-center">
            <Search size={18} color="#0f172a" />
          </View>

          <TextInput
            ref={searchRef}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by order ID, product, status or city..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 font-sans text-sm text-gray-900"
          />

          {!!search && (
            <Pressable
              onPress={() => setSearch("")}
              hitSlop={10}
              className="h-10 w-10 rounded-2xl bg-gray-100 items-center justify-center"
            >
              <X size={16} color="#334155" />
            </Pressable>
          )}
        </View>
      </View>

      {/* List */}
      {filtered.length === 0 ? (
        <View className="px-4 mt-6">
          <Card>
            <View className="items-center justify-center py-10">
              <View className="h-12 w-12 rounded-2xl bg-gray-100 border border-gray-200 items-center justify-center">
                <Package size={22} color="#0f172a" />
              </View>

              <Text className="mt-3 font-heading2 text-lg text-gray-900">
                {search ? "No matching orders" : "No orders yet"}
              </Text>

              <Text className="mt-1 font-sans text-sm text-gray-500 text-center">
                {search
                  ? "Try a different search term."
                  : "Your orders will appear here once you place them."}
              </Text>

              <Pressable
                onPress={() => router.push("/(tabs)/shop" as any)}
                className="mt-5 h-12 px-5 rounded-2xl bg-primary items-center justify-center"
              >
                <Text className="font-sans text-white">
                  View Products
                </Text>
              </Pressable>
            </View>
          </Card>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => it._id}
          renderItem={renderOrder}
          contentContainerStyle={{ paddingTop: 14, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
