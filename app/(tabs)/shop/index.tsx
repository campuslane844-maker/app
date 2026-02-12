import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth';
import { AppHeader } from '@/components/AppHeader';
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  Package,
  Tag,
  IndianRupee,
  Check,
  Layers,
  ShoppingCart,
} from 'lucide-react-native';
import { Switch } from 'react-native';

/* ---------------- Types ---------------- */
type Category = { _id: string; name: string; image?: string };

type Variant = {
  _id?: string;
  name: string;
  price: number;
  cutoffPrice?: number;
  stock: number;
  images?: string[];
};

type Product = {
  _id: string;
  name: string;
  description?: string;
  images?: string[];
  variants: Variant[];
  category?: { _id?: string; name?: string; image?: string } | string;
  brand?: string;
  minPrice?: number;
  totalStock?: number;
  createdAt?: string;
};

/* ---------------- Config ---------------- */
const AWS_URL = process.env.EXPO_PUBLIC_AWS_URL || '';

/* ---------------- Helpers ---------------- */
const resolveImg = (v?: string) => {
  if (!v) return '';
  if (v.startsWith('http://') || v.startsWith('https://')) return v;
  if (!AWS_URL) return v;
  return `${AWS_URL}/${v.replace(/^\//, '')}`;
};

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

/* ---------------- UI primitives ---------------- */
function Card({ children }: { children: React.ReactNode }) {
  return <View className="rounded-3xl border border-gray-200 bg-white p-4">{children}</View>;
}

function Pill({ text, active, onPress }: { text: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-4 py-2 ${
        active ? 'border-primary bg-primary' : 'border-gray-200 bg-white'
      }`}>
      <Text className={`font-sans text-sm ${active ? 'text-white' : 'text-gray-800'}`}>
        {text}
      </Text>
    </Pressable>
  );
}

function SmallLabel({ children }: { children: React.ReactNode }) {
  return <Text className="font-sans text-xs font-semibold text-gray-600">{children}</Text>;
}

function InputBox({
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
}) {
  return (
    <View className="h-12 justify-center rounded-2xl border border-gray-300 bg-gray-50 px-3">
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType}
        className="font-sans text-sm text-gray-900"
      />
    </View>
  );
}

/* ---------------- SnackBar ---------------- */
function SnackBar({
  snack,
  onClose,
}: {
  snack: null | { text: string; tone?: 'success' | 'error' | 'info' };
  onClose: () => void;
}) {
  if (!snack) return null;

  const cls =
    snack.tone === 'success'
      ? 'border-green-200 bg-green-50'
      : snack.tone === 'error'
        ? 'border-red-200 bg-red-50'
        : 'border-gray-200 bg-white';

  const textCls =
    snack.tone === 'success'
      ? 'text-green-800'
      : snack.tone === 'error'
        ? 'text-red-800'
        : 'text-gray-900';

  return (
    <View className="absolute bottom-6 left-4 right-4">
      <View
        className={`flex-row items-center justify-between rounded-2xl border px-4 py-3 shadow-xl ${cls}`}>
        <Text className={`flex-1 pr-3 font-sans font-extrabold ${textCls}`}>{snack.text}</Text>

        <Pressable onPress={onClose} hitSlop={10}>
          <X size={18} color="#6B7280" />
        </Pressable>
      </View>
    </View>
  );
}

/* ========================================================= */
export default function ProductsScreen() {
  // data
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // ui state
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(30);

  // categories
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // search debounce
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // filter modal
  const [showFilters, setShowFilters] = useState(false);

  // filters
  const [brand, setBrand] = useState('');
  const [gender, setGender] = useState<'' | 'Boys' | 'Girls' | 'Unisex'>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'price_asc' | 'price_desc' | 'newest'>(
    'relevance'
  );

  // snack
  const [snack, setSnack] = useState<null | { text: string; tone?: 'success' | 'error' | 'info' }>(
    null
  );
  const snackTimer = useRef<any>(null);

  const showSnack = (text: string, tone: 'success' | 'error' | 'info' = 'info') => {
    setSnack({ text, tone });
    if (snackTimer.current) clearTimeout(snackTimer.current);
    snackTimer.current = setTimeout(() => setSnack(null), 1800);
  };

  /* ---------------- Debounce search ---------------- */
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(id);
  }, [query]);

  /* ---------------- Fetch categories ---------------- */
  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const res = await api.get('/categories', { params: { limit: 100 } });
      const items: any[] = Array.isArray(res.data)
        ? res.data
        : res.data?.docs || res.data?.data || res.data?.items || res.data;

      setCategories(items || []);
    } catch (e) {
      console.error('fetchCategories error', e);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  /* ---------------- Fetch products ---------------- */
  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);

    try {
      const params: any = {
        page,
        limit,
        search: debouncedQuery || undefined,
        category: selectedCategory || undefined,
        brand: brand || undefined,
        gender: gender || undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        inStock: inStockOnly || undefined,
        sort: sortBy,
      };

      const res = await api.get('/products', { params });
      const data = res.data;

      const items: any[] = Array.isArray(data)
        ? data
        : data?.docs || data?.data || data?.items || [];

      setProducts(items || []);
      setTotal(data?.total || items?.length || 0);

      setTotalPages(
        data?.totalPages || Math.max(1, Math.ceil((data?.total || items?.length || 0) / limit))
      );
    } catch (e) {
      console.error('fetchProducts error', e);
      setProducts([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoadingProducts(false);
    }
  }, [
    page,
    limit,
    debouncedQuery,
    selectedCategory,
    brand,
    gender,
    minPrice,
    maxPrice,
    inStockOnly,
    sortBy,
  ]);

  /* ---------------- Initial load ---------------- */
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  /* ---------------- Refresh ---------------- */
  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchCategories();
      await fetchProducts();
    } finally {
      setRefreshing(false);
    }
  }, [fetchCategories, fetchProducts]);

  /* ---------------- Actions ---------------- */
  const handlePickCategory = (id: string | null) => {
    setSelectedCategory(id);
    setPage(1);
  };

  const handleClearFilters = () => {
    setBrand('');
    setGender('');
    setMinPrice('');
    setMaxPrice('');
    setInStockOnly(false);
    setSortBy('relevance');
    setPage(1);
  };

  const priceLabel = useMemo(() => {
    const min = minPrice ? Number(minPrice) : undefined;
    const max = maxPrice ? Number(maxPrice) : undefined;

    if (min == null && max == null) return 'Any price';
    if (min != null && max != null) return `₹${min} - ₹${max}`;
    if (min != null) return `>= ₹${min}`;
    return `<= ₹${max}`;
  }, [minPrice, maxPrice]);

  const handleAddToCart = async (product: Product) => {
    if (!product) return;

    const firstVariant = product.variants?.[0];

    if (!firstVariant || firstVariant.stock < 1) {
      showSnack('This item is out of stock.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const { isAuthenticated } = useAuthStore.getState();

      if (isAuthenticated) {
        await api.post('/cart/items', {
          productId: product._id,
          variantId: firstVariant._id,
          quantity: 1,
          price: firstVariant.price,
        });
      } else {
      }

      showSnack('Added to cart successfully!', 'success');
    } catch (err: any) {
      console.error('addToCart error', err?.response);
      const message =
        err?.response?.data?.error?.message || 'Failed to add to cart. Please try again.';

      showSnack(message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  /* ---------------- Product Card ---------------- */
  const renderProduct = ({ item }: { item: Product }) => {
    const firstVariant = item.variants?.[0];
    const price = firstVariant?.price;
    const stock = firstVariant?.stock ?? 0;

    const imgKey = item.images?.[0] || firstVariant?.images?.[0];
    const imgUrl = resolveImg(imgKey);

    const categoryName =
      item.category && typeof item.category !== 'string' ? item.category?.name : undefined;

    return (
      <View className="w-1/2 pr-2">
        <Pressable
          onPress={() => router.push(`/(tabs)/shop/product/${item._id}` as any)}
          className="overflow-hidden rounded-3xl border border-gray-200 bg-white"
          style={{ minHeight: 260 }}>
          {/* Image */}
          <View className="h-36 w-full overflow-hidden bg-gray-100">
            {imgUrl ? (
              <Image source={{ uri: imgUrl }} resizeMode="cover" className="h-full w-full" />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Package size={28} color="#94a3b8" />
              </View>
            )}

            {!!categoryName && (
              <View className="absolute left-2 top-2 rounded-full border border-gray-200 bg-white/95 px-3 py-1">
                <Text className="font-heading2 text-[11px] text-gray-800">
                  {categoryName}
                </Text>
              </View>
            )}

            {stock < 1 && (
              <View className="absolute right-2 top-2 rounded-full border border-red-200 bg-red-50 px-3 py-1">
                <Text className="font-sans text-[11px] font-extrabold text-red-700">
                  Out of stock
                </Text>
              </View>
            )}
          </View>

          {/* Content */}
          <View className="flex-1 justify-between p-3">
            <View>
              <Text className="font-heading1 text-sm text-gray-900" numberOfLines={2}>
                {item.name}
              </Text>

              <Text className="mt-1 font-sans text-xs text-gray-500" numberOfLines={1}>
                {item.brand || '—'}
              </Text>
            </View>

            <View className="mt-2 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <IndianRupee size={12} color="#0f172a" />
                <Text className="font-sans text-base text-gray-900">
                  {typeof price === 'number' ? price : '—'}
                </Text>
              </View>

              <Pressable
                disabled={actionLoading || stock < 1}
                onPress={(e) => {
                  e.stopPropagation?.();
                  handleAddToCart(item);
                }}
                className={`h-10 flex-row items-center justify-center gap-2 rounded-2xl px-4 ${
                  stock < 1 ? 'bg-gray-200' : 'bg-primary'
                }`}>
                <ShoppingCart size={16} color={stock < 1 ? '#64748b' : '#fff'} />
                <Text
                  className={`font-heading1 text-xs ${
                    stock < 1 ? 'text-gray-600' : 'text-white'
                  }`}>
                  Add
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </View>
    );
  };

  /* ---------------- Category row ---------------- */
  const CategoriesRow = () => {
    return (
      <View className="mt-4 px-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 12 }}>
          <View className="flex-row gap-2">
            <Pill text="All" active={!selectedCategory} onPress={() => handlePickCategory(null)} />

            {loadingCategories ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <View key={i} className="h-10 w-24 rounded-full bg-gray-200" />
                ))}
              </>
            ) : (
              categories.map((cat) => (
                <Pill
                  key={cat._id}
                  text={cat.name}
                  active={selectedCategory === cat._id}
                  onPress={() => handlePickCategory(cat._id)}
                />
              ))
            )}
          </View>
        </ScrollView>
      </View>
    );
  };


  /* ---------------- Filters Modal ---------------- */
  const FiltersModal = () => {
    return (
      <Modal
        visible={showFilters}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-[28px] border border-gray-200 bg-white px-4 pb-6 pt-4">
            {/* Top bar */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View className="h-10 w-10 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10">
                  <Tag size={18} color="#2563eb" />
                </View>
                <Text className="font-heading2 text-lg text-gray-900">Filters</Text>
              </View>

              <Pressable
                onPress={() => setShowFilters(false)}
                className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
                <X size={18} color="#334155" />
              </Pressable>
            </View>

            <View className="mt-4 gap-4">
              {/* Brand */}
              <View className="gap-2">
                <SmallLabel>Brand</SmallLabel>
                <InputBox
                  value={brand}
                  onChangeText={(t) => {
                    setBrand(t);
                    setPage(1);
                  }}
                  placeholder="e.g. Scholastic"
                />
              </View>

              {/* Gender */}
              <View className="gap-2">
                <SmallLabel>Gender</SmallLabel>

                <View className="flex-row flex-wrap gap-2">
                  {[
                    { key: '', label: 'Any' },
                    { key: 'Boys', label: 'Boys' },
                    { key: 'Girls', label: 'Girls' },
                    { key: 'Unisex', label: 'Unisex' },
                  ].map((g) => {
                    const active = gender === (g.key as any);

                    return (
                      <Pressable
                        key={g.label}
                        onPress={() => {
                          setGender(g.key as any);
                          setPage(1);
                        }}
                        className={`rounded-full border px-4 py-2 ${active ? 'border-primary bg-primary' : 'border-gray-200 bg-white'}`}>
                        <Text
                          className={`font-sans text-sm font-bold ${active ? 'text-white' : 'text-gray-800'}`}>
                          {g.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Price */}
              <View className="gap-2">
                <SmallLabel>Price</SmallLabel>

                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <InputBox
                      value={minPrice}
                      onChangeText={(t) => setMinPrice(t.replace(/[^0-9]/g, ''))}
                      placeholder="Min"
                      keyboardType="numeric"
                    />
                  </View>
                  <View className="flex-1">
                    <InputBox
                      value={maxPrice}
                      onChangeText={(t) => setMaxPrice(t.replace(/[^0-9]/g, ''))}
                      placeholder="Max"
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <Text className="font-sans text-xs text-gray-500">{priceLabel}</Text>
              </View>

              {/* In stock */}
              <View className="flex-row items-center justify-between">
                <View className="gap-1">
                  <Text className="font-sans font-extrabold text-gray-900">In stock only</Text>
                  <Text className="font-sans text-xs text-gray-500">Hide unavailable items</Text>
                </View>

                <Switch
                  value={inStockOnly}
                  onValueChange={(v) => {
                    setInStockOnly(v);
                    setPage(1);
                  }}
                />
              </View>

              {/* Sort */}
              <View className="gap-2">
                <SmallLabel>Sort</SmallLabel>

                <View className="flex-row flex-wrap gap-2">
                  {[
                    { key: 'relevance', label: 'Relevance' },
                    { key: 'price_asc', label: 'Price low-high' },
                    { key: 'price_desc', label: 'Price high-low' },
                    { key: 'newest', label: 'Newest' },
                  ].map((s) => {
                    const active = sortBy === (s.key as any);

                    return (
                      <Pressable
                        key={s.key}
                        onPress={() => {
                          setSortBy(s.key as any);
                          setPage(1);
                        }}
                        className={`flex-row items-center gap-2 rounded-2xl border px-4 py-2 ${
                          active ? 'border-primary bg-primary' : 'border-gray-200 bg-white'
                        }`}>
                        {active ? (
                          <Check size={16} color="#fff" />
                        ) : (
                          <Layers size={16} color="#334155" />
                        )}
                        <Text
                          className={`font-sans text-sm font-bold ${active ? 'text-white' : 'text-gray-800'}`}>
                          {s.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Buttons */}
              <View className="mt-2 flex-row gap-3">
                <Pressable
                  onPress={handleClearFilters}
                  className="h-12 flex-1 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50">
                  <Text className="font-sans font-extrabold text-gray-900">Reset</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setPage(1);
                    setShowFilters(false);
                    fetchProducts();
                  }}
                  className="h-12 flex-1 items-center justify-center rounded-2xl bg-primary">
                  <Text className="font-sans font-extrabold text-white">Apply</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  /* ---------------- Pagination Footer ---------------- */
  const Pagination = () => {
    return (
      <View className="mt-4 px-4">
        <Card>
          <View className="flex-row items-center justify-between">
            <Text className="font-sans text-sm text-gray-700">
              Page {page} of {totalPages}
            </Text>

            <View className="flex-row items-center gap-2">
              <Pressable
                disabled={page <= 1}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                className={`h-10 flex-row items-center justify-center gap-2 rounded-2xl px-4 ${
                  page <= 1 ? 'bg-gray-200' : 'bg-gray-100'
                }`}>
                <ChevronLeft size={18} color="#0f172a" />
                <Text className="font-sans text-sm text-gray-900">Prev</Text>
              </Pressable>

              <Pressable
                disabled={page >= totalPages}
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={`h-10 flex-row items-center justify-center gap-2 rounded-2xl px-4 ${
                  page >= totalPages ? 'bg-gray-200' : 'bg-gray-100'
                }`}>
                <Text className="font-sans text-sm text-gray-900">Next</Text>
                <ChevronRight size={18} color="#0f172a" />
              </Pressable>
            </View>
          </View>
        </Card>
      </View>
    );
  };

  /* ========================================================= */
  return (
    <View className="flex-1 bg-background">
      <AppHeader />

      <FiltersModal />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Title */}
        <View className="px-4 pt-5">
          <Text className="font-heading1 text-2xl text-gray-900">Shop for School Essentials</Text>
          <Text className="mt-1 font-sans text-sm text-gray-500">
            Find books, uniforms, stationery and more — filtered and sorted for you.
          </Text>
        </View>

        {/* Search */}
        <SearchBar
  query={query}
  setQuery={setQuery}
  setPage={setPage}
  setDebouncedQuery={setDebouncedQuery}
  setShowFilters={setShowFilters}
/>


        {/* Categories */}
        <CategoriesRow />

        {/* Results meta */}
        <View className="mt-4 flex-row items-center justify-between px-4">
          <Text className="font-sans text-sm text-gray-600">
            {loadingProducts ? 'Loading products...' : `${total} results`}
          </Text>

          <Pressable
            onPress={() => {
              // simple toggle between 30 and 50
              setLimit((v) => (v === 30 ? 50 : 30));
              setPage(1);
            }}
            className="rounded-full border border-gray-200 bg-white px-4 py-2">
            <Text className="font-sans text-xs text-gray-800">Per page: {limit}</Text>
          </Pressable>
        </View>

        {/* Grid */}
        <View className="mt-4 px-4">
          {loadingProducts ? (
            <View className="flex-row flex-wrap justify-between">
              {Array.from({ length: 8 }).map((_, i) => (
                <View key={i} className="mb-4 h-64 w-[48%] rounded-3xl bg-gray-200" />
              ))}
            </View>
          ) : products.length === 0 ? (
            <Card>
              <Text className="font-sans text-sm font-semibold text-gray-700">
                No products match your filters.
              </Text>
            </Card>
          ) : (
            <FlatList
              data={products}
              keyExtractor={(it) => it._id}
              numColumns={2}
              scrollEnabled={false}
              renderItem={renderProduct}
              columnWrapperStyle={{ gap: 12 }}
              contentContainerStyle={{ gap: 12 }}
            />
          )}
        </View>

        {/* Pagination */}
        <Pagination />
      </ScrollView>

      {/* Snackbar */}
      <SnackBar snack={snack} onClose={() => setSnack(null)} />
    </View>
  );
}

function SearchBar({
  query,
  setQuery,
  setPage,
  setDebouncedQuery,
  setShowFilters,
}: {
  query: string;
  setQuery: (t: string) => void;
  setPage: (n: number) => void;
  setDebouncedQuery: (t: string) => void;
  setShowFilters: (v: boolean) => void;
}) {
  return (
    <View className="mt-4 px-4">
      <View className="flex-row items-center gap-3 rounded-3xl border border-gray-200 bg-white px-3 py-3">
        <View className="h-10 w-10 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10">
          <Search size={18} color="#2563eb" />
        </View>

        <TextInput
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            setPage(1);
          }}
          placeholder="Search products..."
          placeholderTextColor="#9CA3AF"
          className="flex-1 font-sans text-sm text-gray-900"
        />

        {!!query && (
          <Pressable
            onPress={() => {
              setQuery('');
              setDebouncedQuery('');
              setPage(1);
            }}
            hitSlop={10}
            className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
            <X size={16} color="#334155" />
          </Pressable>
        )}

        <Pressable
          onPress={() => setShowFilters(true)}
          className="h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
          <SlidersHorizontal size={18} color="#334155" />
        </Pressable>
      </View>
    </View>
  );
}
