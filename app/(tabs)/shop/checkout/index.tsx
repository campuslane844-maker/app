import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import api from "@/lib/api";
import { AppHeader } from "@/components/AppHeader";
import {
  ArrowLeft,
  CreditCard,
  MapPin,
  Phone,
  Truck,
  User,
} from "lucide-react-native";

import RazorpayCheckout from "react-native-razorpay";

/* ---------------- Types ---------------- */
type Variant = {
  _id?: string;
  name?: string;
  price: number;
  stock?: number;
  images?: string[];
};

type ProductRef = {
  _id?: string;
  name?: string;
  images?: string[];
  variants?: Variant[];
};

type CartItem = {
  _id?: string;
  productId?: ProductRef | string;
  variantId?: Variant | string;
  quantity: number;
  price: number;
};

type CartShape = { _id?: string; items: CartItem[] } | null;

/* ---------------- Config ---------------- */
const AWS_URL = process.env.EXPO_PUBLIC_AWS_URL || "";

/* ---------------- Helpers ---------------- */
function isString(x: unknown): x is string {
  return typeof x === "string";
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

function getProduct(item: CartItem): ProductRef | undefined {
  const p = (item as any).product || item.productId;
  if (!p) return undefined;
  return isString(p) ? undefined : (p as ProductRef);
}

function getVariant(item: CartItem): Variant | undefined {
  if (!item) return undefined;
  if (item.variantId && !isString(item.variantId)) return item.variantId as Variant;

  const product = getProduct(item);
  if (product?.variants && item.variantId) {
    return product.variants.find((v) => String(v._id) === String(item.variantId));
  }

  return undefined;
}

/* ---------------- UI primitives ---------------- */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-[28px] border border-gray-200 bg-white p-4">
      {children}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  error,
  icon,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
  error?: string;
  icon?: React.ReactNode;
}) {
  return (
    <View className="gap-2">
      <Text className="font-sans text-xs font-bold text-gray-700">{label}</Text>

      <View
        className={`h-12 rounded-2xl border px-3 flex-row items-center gap-2 ${
          error ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"
        }`}
      >
        {icon}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          keyboardType={keyboardType}
          className="flex-1 font-sans text-sm text-gray-900"
        />
      </View>

      {!!error && (
        <Text className="font-sans text-xs text-red-700">{error}</Text>
      )}
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
        className={`font-sans font-extrabold ${
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
}: {
  text: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={`h-12 rounded-2xl border flex-row items-center justify-center ${
        disabled ? "border-gray-200 bg-gray-100" : "border-gray-200 bg-white"
      }`}
    >
      <Text className="font-sans font-extrabold text-gray-900">{text}</Text>
    </Pressable>
  );
}

/* ========================================================= */
export default function CheckoutScreen() {
  const [shipping, setShipping] = useState<number>(0);
  const [cart, setCart] = useState<CartShape>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [address, setAddress] = useState({
    name: "",
    phone: "",
    street: "",
    streetOptional: "",
    city: "",
    state: "",
    zipcode: "",
    country: "India",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ---------------- Fetch cart ---------------- */
  const fetchCart = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/cart");
      const data = res.data?.data || res.data || null;
      setCart(data);
    } catch (e) {
      console.error("fetchCart error", e);
      setCart({ items: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  /* ---------------- Fetch shipping ---------------- */
  const fetchShipping = useCallback(async () => {
    try {
      const res = await api.get("/shipping");
      const cost = Number(res.data?.cost ?? res.data?.data?.cost ?? 0);
      setShipping(isNaN(cost) ? 0 : cost);
    } catch (e) {
      console.log("fetchShipping error", e);
      setShipping(0);
    }
  }, []);

  useEffect(() => {
    fetchCart();
    fetchShipping();
  }, [fetchCart, fetchShipping]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchCart();
      await fetchShipping();
    } finally {
      setRefreshing(false);
    }
  }, [fetchCart, fetchShipping]);

  /* ---------------- Pricing ---------------- */
  const subtotal = useMemo(() => {
    if (!cart?.items) return 0;

    return cart.items.reduce((s, it) => {
      const v = getVariant(it);
      const price = Number(v?.price ?? it.price ?? 0);
      const qty = Number(it.quantity ?? 0);
      return s + price * qty;
    }, 0);
  }, [cart]);

  const total = useMemo(() => subtotal + shipping, [subtotal, shipping]);

  /* ---------------- Validation ---------------- */
  function updateAddressField<K extends keyof typeof address>(key: K, value: string) {
    setAddress((a) => ({ ...a, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function validateAddress() {
    const e: Record<string, string> = {};

    if (!address.name.trim()) e.name = "Name is required";
    if (!/^[6-9]\d{9}$/.test(address.phone.trim())) e.phone = "Enter a valid 10-digit phone";
    if (!address.street.trim()) e.street = "Street is required";
    if (!address.city.trim()) e.city = "City is required";
    if (!address.state.trim()) e.state = "State is required";
    if (!/^\d{5,6}$/.test(address.zipcode.trim())) e.zipcode = "Enter a valid pin code";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  /* ---------------- Create internal order ---------------- */
  async function createOrderOnServer(paymentMode: "COD" | "Razorpay") {
    if (!cart) throw new Error("Cart not loaded");

    const payload = {
      items: cart.items.map((i) => ({
        productId: (getProduct(i)?._id || i.productId) as string,
        variantId: (getVariant(i)?._id || i.variantId) as string,
        quantity: i.quantity,
        price: i.price,
      })),
      totalAmount: total,
      shippingAddress: { ...address },
      shippingMethod: "standard",
      paymentType: paymentMode,
    };

    const res = await api.post("/orders/checkout", payload);
    return res.data?.data;
  }

  /* ---------------- Create Razorpay order ---------------- */
  async function createPaymentOrder(orderId: string) {
    const res = await api.post("/payment/order", { orderId });
    return res.data?.data;
  }

  /* ---------------- Verify Razorpay ---------------- */
  async function verifyPayment(payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) {
    await api.post("/payment/verify", payload);
  }

  /* ---------------- COD Checkout ---------------- */
  async function handlePayOnDelivery() {
    if (!cart || cart.items.length === 0) {
      Alert.alert("Cart empty", "Add items before checkout.");
      return;
    }

    if (!validateAddress()) {
      Alert.alert("Fix address", "Please fix the highlighted address fields.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await createOrderOnServer("COD");
      const orderId = data?.orderId || data?._id || data?.id;

      Alert.alert("Order placed", "Cash on Delivery order placed successfully.");

      if (orderId) router.replace(`/(tabs)/shop/orders/${orderId}` as any);
      else router.replace("/(tabs)/shop/orders" as any);
    } catch (e: any) {
      console.error("COD checkout error", e);
      Alert.alert("Checkout failed", e?.response?.data?.message || "Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------------- Razorpay Checkout ---------------- */
  async function handlePayNow() {
    if (!cart || cart.items.length === 0) {
      Alert.alert("Cart empty", "Add items before checkout.");
      return;
    }

    if (!validateAddress()) {
      Alert.alert("Fix address", "Please fix the highlighted address fields.");
      return;
    }

    setSubmitting(true);

    try {
      // 1) Create internal order
      const checkoutData = await createOrderOnServer("Razorpay");
      const orderId = checkoutData?.orderId || checkoutData?._id || checkoutData?.id;

      if (!orderId) throw new Error("Order ID missing from checkout response.");

      // 2) Create Razorpay order
      const paymentData = await createPaymentOrder(orderId);
    
      const razorpayOrderId = paymentData?.razorpayOrderId;
      const amount = paymentData?.amount; // paise
      const currency = paymentData?.currency || "INR";
      const key = paymentData?.key;
        
      if (!razorpayOrderId || !amount || !key) {
        throw new Error("Payment order response invalid.");
      }

      // 3) Open Razorpay native checkout
      const options: any = {
        key,
        order_id: razorpayOrderId,
        amount,
        currency,
        name: "Campuslane",
        description: "Order Payment",
        prefill: {
          name: address.name,
          contact: address.phone,
        },
        notes: {
          internalOrderId: orderId,
        },
        theme: {
          color: "#2563eb",
        },
      };

      const response = await RazorpayCheckout.open(options);

      // response:
      // {
      //   razorpay_payment_id,
      //   razorpay_order_id,
      //   razorpay_signature
      // }

      await verifyPayment({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      });

      Alert.alert("Payment success", "Order confirmed.");

      router.replace(`/(tabs)/shop/orders/${orderId}` as any);
    } catch (e: any) {
      console.log("Razorpay error", e);

      // Razorpay cancel returns something like:
      // { description: 'Payment cancelled by user', code: 2 }
      const msg =
        "Payment cancelled";

      Alert.alert("Payment", msg);
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------------- UI states ---------------- */
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

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <View className="flex-1 bg-background">
        <AppHeader />

        <View className="px-4 pt-5">
          <Text className="font-heading1 text-2xl text-gray-900">Checkout</Text>
          <Text className="mt-1 font-sans text-sm text-gray-500">
            Your cart is empty.
          </Text>
        </View>

        <View className="px-4 mt-6">
          <PrimaryButton
            text="Continue shopping"
            onPress={() => router.push("/(tabs)/shop/products" as any)}
          />
        </View>
      </View>
    );
  }

  /* ---------------- Main UI ---------------- */
  return (
    <View className="flex-1 bg-background">
      <AppHeader />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View className="px-4 pt-5 flex-row items-center justify-between">
          <View>
            <Text className="font-heading1 text-2xl text-gray-900">
              Complete your order
            </Text>
            <Text className="mt-1 font-sans text-sm text-gray-500">
              Enter delivery details and choose payment.
            </Text>
          </View>

          <Pressable
            onPress={() => router.back()}
            className="h-10 px-4 rounded-2xl border border-gray-200 bg-white flex-row items-center gap-2"
          >
            <ArrowLeft size={16} color="#0f172a" />
            <Text className="font-sans text-sm font-bold text-gray-900">
              Cart
            </Text>
          </Pressable>
        </View>

        {/* Address */}
        <View className="px-4 mt-5">
          <Card>
            <View className="flex-row items-center gap-2">
              <View className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/15 items-center justify-center">
                <MapPin size={18} color="#2563eb" />
              </View>
              <Text className="font-heading2 text-lg text-gray-900">
                Shipping Address
              </Text>
            </View>

            <View className="mt-4 gap-4">
              <Field
                label="Name *"
                value={address.name}
                onChangeText={(t) => updateAddressField("name", t)}
                placeholder="Full name"
                error={errors.name}
                icon={<User size={16} color="#334155" />}
              />

              <Field
                label="Phone *"
                value={address.phone}
                onChangeText={(t) => updateAddressField("phone", t.replace(/[^0-9]/g, ""))}
                placeholder="10-digit mobile"
                keyboardType="numeric"
                error={errors.phone}
                icon={<Phone size={16} color="#334155" />}
              />

              <Field
                label="Street *"
                value={address.street}
                onChangeText={(t) => updateAddressField("street", t)}
                placeholder="House no, street, area"
                error={errors.street}
                icon={<MapPin size={16} color="#334155" />}
              />

              <Field
                label="Street (Optional)"
                value={address.streetOptional}
                onChangeText={(t) => updateAddressField("streetOptional", t)}
                placeholder="Landmark, apartment, etc."
                icon={<MapPin size={16} color="#334155" />}
              />

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Field
                    label="City *"
                    value={address.city}
                    onChangeText={(t) => updateAddressField("city", t)}
                    placeholder="City"
                    error={errors.city}
                  />
                </View>

                <View className="flex-1">
                  <Field
                    label="State *"
                    value={address.state}
                    onChangeText={(t) => updateAddressField("state", t)}
                    placeholder="State"
                    error={errors.state}
                  />
                </View>
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Field
                    label="Zipcode *"
                    value={address.zipcode}
                    onChangeText={(t) => updateAddressField("zipcode", t.replace(/[^0-9]/g, ""))}
                    placeholder="PIN"
                    keyboardType="numeric"
                    error={errors.zipcode}
                  />
                </View>

                <View className="flex-1">
                  <Field
                    label="Country"
                    value={address.country}
                    onChangeText={(t) => updateAddressField("country", t)}
                    placeholder="Country"
                  />
                </View>
              </View>
            </View>
          </Card>
        </View>

        {/* Order Summary */}
        <View className="px-4 mt-5">
          <Card>
            <View className="flex-row items-center gap-2">
              <View className="h-10 w-10 rounded-2xl bg-gray-100 border border-gray-200 items-center justify-center">
                <Truck size={18} color="#0f172a" />
              </View>
              <Text className="font-heading2 text-lg text-gray-900">
                Order summary
              </Text>
            </View>

            <View className="mt-4 gap-3">
              {cart.items.map((item, idx) => {
                const product = getProduct(item);
                const variant = getVariant(item);

                const imgKey = product?.images?.[0] || variant?.images?.[0];
                const imgUrl = resolveImg(imgKey);

                const title = product?.name || "Product";
                const linePrice =
                  (variant?.price ?? item.price ?? 0) * (item.quantity ?? 0);

                return (
                  <View key={item._id ?? idx} className="flex-row items-center gap-3">
                    <View className="h-14 w-14 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
                      {imgUrl ? (
                        <Image
                          source={{ uri: imgUrl }}
                          resizeMode="cover"
                          style={{ width: "100%", height: "100%" }}
                        />
                      ) : null}
                    </View>

                    <View className="flex-1">
                      <Text className="font-sans text-sm font-extrabold text-gray-900" numberOfLines={1}>
                        {title}
                      </Text>
                      <Text className="font-sans text-xs text-gray-500" numberOfLines={1}>
                        {variant?.name || "Variant"} • Qty {item.quantity}
                      </Text>
                    </View>

                    <Text className="font-sans text-sm font-extrabold text-gray-900">
                      {formatCurrency(linePrice)}
                    </Text>
                  </View>
                );
              })}

              {/* totals */}
              <View className="mt-3 border-t border-gray-200 pt-4 gap-2">
                <View className="flex-row items-center justify-between">
                  <Text className="font-sans text-sm text-gray-600">Subtotal</Text>
                  <Text className="font-sans text-sm font-extrabold text-gray-900">
                    {formatCurrency(subtotal)}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between">
                  <Text className="font-sans text-sm text-gray-600">Delivery</Text>
                  <Text className="font-sans text-sm font-extrabold text-gray-900">
                    {shipping === 0 ? "Free" : formatCurrency(shipping)}
                  </Text>
                </View>

                <View className="mt-2 flex-row items-center justify-between">
                  <Text className="font-sans text-base font-extrabold text-gray-900">
                    Total
                  </Text>
                  <Text className="font-sans text-xl font-extrabold text-gray-900">
                    {formatCurrency(total)}
                  </Text>
                </View>
              </View>

              {/* Payment */}
              <View className="mt-4 gap-3">
                <PrimaryButton
                  disabled={submitting}
                  onPress={handlePayNow}
                  icon={<CreditCard size={18} color="#fff" />}
                  text={submitting ? "Processing..." : `Pay now • ${formatCurrency(total)}`}
                />

                <View className="h-[1px] bg-gray-200" />

                <SecondaryButton
                  disabled={submitting}
                  onPress={handlePayOnDelivery}
                  text={submitting ? "Placing order..." : "Pay on Delivery"}
                />
              </View>

              <Text className="mt-2 font-sans text-xs text-gray-500 text-center">
                Prices include GST where applicable.
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
