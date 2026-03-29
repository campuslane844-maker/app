import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
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
import { useSubscriptionStore } from '@/lib/store/subscription';
import { AppHeader } from '@/components/AppHeader';
const AWS_URL = process.env.EXPO_PUBLIC_AWS_URL || '';

import {
  ArrowRight,
  Check,
  Crown,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash,
  X,
} from 'lucide-react-native';

/* ---------------- Types ---------------- */
type Role = 'student' | 'teacher' | 'parent';

type ClassItem = {
  _id: string;
  name: string;
};

type UserProfile = {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: Role;

  // student
  age?: number;
  studentCode?: string;
  classLevel?: ClassItem;

  // teacher
  upiId?: string;

  // location
  pincode?: string;
  city?: string;
  state?: string;
  country?: string;
};

type ParentRequest = {
  _id: string;
  parentName: string;
  parentEmail?: string;
  parentPhone?: string;
  createdAt?: string;
};

type RecentItem = {
  _id: string;
  contentId: {
    _id: string;
    title: string;
    type?: string;
    thumbnailKey?: string;
  };
  status?: 'completed' | 'in_progress' | 'not_started';
  progressPercent?: number;
  updatedAt?: string;
};

type KidLink = any;
type PendingLink = any;

const EMPTY_PROFILE: UserProfile = {
  _id: '',
  name: '',
  email: '',
  phone: '',
  role: 'student',
  age: 0,
  upiId: '',
  pincode: '',
  city: '',
  state: '',
  country: '',
};

/* ---------------- Small UI helpers ---------------- */
function Pill({ text, tone = 'neutral' }: { text: string; tone?: 'neutral' | 'green' | 'yellow' }) {
  const cls =
    tone === 'green'
      ? 'bg-green-100 text-green-700 border-green-200'
      : tone === 'yellow'
        ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
        : 'bg-gray-100 text-gray-700 border-gray-200';

  return (
    <View className={`rounded-full border px-3 py-1 ${cls}`}>
      <Text className="font-sans text-xs font-semibold">{text}</Text>
    </View>
  );
}

function Avatar({ name }: { name?: string }) {
  const initials = (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

  return (
    <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
      <Text className="font-sans font-extrabold text-primary">{initials}</Text>
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View className="rounded-2xl border border-gray-200 bg-white p-4">{children}</View>;
}

function Row({
  label,
  value,
  editable,
  onChangeText,
  keyboardType,
  placeholder,
}: {
  label: string;
  value?: string;
  editable?: boolean;
  onChangeText?: (t: string) => void;
  keyboardType?: any;
  placeholder?: string;
}) {
  return (
    <View className="gap-2">
      <Text className="font-sans text-xs font-semibold text-gray-600">{label}</Text>

      <View
        className={`h-12 justify-center rounded-xl border px-3 ${
          editable ? 'border-gray-300 bg-gray-50' : 'border-gray-200 bg-gray-100'
        }`}>
        <TextInput
          value={value || ''}
          editable={!!editable}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          className="font-sans text-sm text-gray-900"
        />
      </View>
    </View>
  );
}

/* ---------------- SnackBar ---------------- */
function SnackBar({
  snack,
  onClose,
}: {
  snack: null | { text: string; action?: string; onAction?: () => void };
  onClose: () => void;
}) {
  if (!snack) return null;

  return (
    <View className="absolute bottom-6 left-4 right-4">
      <View className="flex-row items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-xl">
        <Text className="flex-1 pr-3 font-sans font-semibold text-gray-900">{snack.text}</Text>

        {snack.action && (
          <Pressable onPress={snack.onAction} className="px-3 py-2">
            <Text className="font-sans font-bold text-primary">{snack.action}</Text>
          </Pressable>
        )}

        <Pressable onPress={onClose} hitSlop={10}>
          <X size={18} color="#6B7280" />
        </Pressable>
      </View>
    </View>
  );
}

function TopTabs({
  tabs,
  active,
  onPress,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  onPress: (key: string) => void;
}) {
  return (
    <View className="border-b border-gray-200 bg-background">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10 }}>
        <View className="flex-row gap-2">
          {tabs.map((t) => {
            const isActive = t.key === active;

            return (
              <Pressable
                key={t.key}
                onPress={() => onPress(t.key)}
                className={`rounded-full border px-4 py-2 ${
                  isActive ? 'border-primary bg-primary' : 'border-gray-200 bg-white'
                }`}>
                <Text
                  className={`font-heading2 text-sm ${isActive ? 'text-white' : 'text-gray-800'}`}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

/* ========================================================= */
export default function ProfileScreen() {
  const { user: authUser, fetchMe } = useAuthStore();
  const userId = authUser?._id;

  const { isSubscribed, fetchSubscription } = useSubscriptionStore();

  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [classes, setClasses] = useState<ClassItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Student panels
  const [requests, setRequests] = useState<ParentRequest[]>([]);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // Parent panels
  const [kids, setKids] = useState<KidLink[]>([]);
  const [pendingLinks, setPendingLinks] = useState<PendingLink[]>([]);
  const [loadingKids, setLoadingKids] = useState(false);
  const [addingKid, setAddingKid] = useState(false);
  const [kidCode, setKidCode] = useState('');

  const role = profile.role || 'student';

  // snack / undo
  const [snack, setSnack] = useState<any | null>(null);
  const undoRef = useRef<any | null>(null);

  const scrollRef = useRef<ScrollView>(null);

  const sectionYRef = useRef<Record<string, number>>({});

  const scrollTo = (key: string) => {
    const y = sectionYRef.current[key];
    if (typeof y !== 'number') return;

    scrollRef.current?.scrollTo({ y: Math.max(0, y - 10), animated: true });
  };

  const tabs = useMemo(() => {
    if (role === 'student') {
      return [
        { key: 'profile', label: 'Profile' },
        { key: 'requests', label: 'Requests' },
        { key: 'recent', label: 'Recent' },
      ];
    }

    if (role === 'parent') {
      return [
        { key: 'profile', label: 'Profile' },
        { key: 'kids', label: 'Kids' },
      ];
    }

    // teacher
    return [{ key: 'profile', label: 'Profile' }];
  }, [role]);

  const [activeTab, setActiveTab] = useState('profile');

  const handleScroll = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;

    const points = Object.entries(sectionYRef.current)
      .map(([key, value]) => ({ key, y: value }))
      .sort((a, b) => a.y - b.y);

    let current = 'profile';
    for (const p of points) {
      if (y >= p.y - 40) current = p.key;
    }

    setActiveTab(current);
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  /* ---------------- Fetch everything ---------------- */
  const fetchProfileAndBase = useCallback(async () => {
    if (!userId) return;

    const [userRes, classesRes] = await Promise.all([
      api.get(`/admin/students/${userId}`),
      api.get('/classes'),
    ]);

    setProfile((prev) => ({ ...prev, ...(userRes.data.data || {}) }));
    setClasses(classesRes.data.data || []);
  }, [userId]);

  const fetchStudentPanels = useCallback(async () => {
    setLoadingRequests(true);
    setLoadingRecent(true);

    try {
      const [reqRes, recentRes] = await Promise.all([
        api.get('/parent/links/pending'),
        api.get('/progress/recent?limit=6'),
      ]);

      const apiRequests = reqRes.data.data || [];
      setRequests(
        apiRequests.map((r: any) => ({
          _id: r._id,
          parentName: r.parentId?.name || 'Parent',
          parentEmail: r.parentId?.email,
          parentPhone: r.parentId?.phone,
          createdAt: r.requestedAt || r.createdAt,
        }))
      );

      const apiRecent = recentRes.data.data || [];
      setRecent(
        apiRecent.map((r: any) => ({
          _id: r._id,
          contentId: {
            _id: r.contentId?._id || '',
            title: r.contentId?.title || 'Untitled',
            type: r.contentId?.type,
            thumbnailKey: r.contentId?.thumbnailKey,
          },
          status: r.status,
          progressPercent: typeof r.progressPercent === 'number' ? r.progressPercent : 0,
          updatedAt: r.updatedAt,
        }))
      );
    } finally {
      setLoadingRequests(false);
      setLoadingRecent(false);
    }
  }, []);

  const fetchParentPanels = useCallback(async () => {
    setLoadingKids(true);
    try {
      const [kidsRes, pendingRes] = await Promise.all([
        api.get('/parent/links'),
        api.get('/parent/links/pending'),
      ]);

      setKids(kidsRes.data.data || []);
      setPendingLinks(pendingRes.data.data || []);
    } finally {
      setLoadingKids(false);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    if (!userId) return;

    await fetchProfileAndBase();

    // after profile loaded, role decides panels
    // but profile update is async, so we read role from response too:
    const userRes = await api.get(`/admin/students/${userId}`);
    const p = userRes.data.data || {};
    setProfile((prev) => ({ ...prev, ...p }));

    if (p.role === 'student') await fetchStudentPanels();
    if (p.role === 'parent') await fetchParentPanels();
  }, [userId, fetchProfileAndBase, fetchStudentPanels, fetchParentPanels]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        await fetchAll();
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [fetchAll]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchMe();
      const role = useAuthStore.getState().user?.role;
      if (role === 'student' || role === 'teacher') {
        await fetchSubscription(role);
      }
      await fetchAll();
    } finally {
      setRefreshing(false);
    }
  }, [fetchAll]);

  /* ---------------- Edit helpers ---------------- */
  const handleChange = (field: keyof UserProfile, value: any) => {
    setProfile((p) => ({ ...p, [field]: value }));
  };

  const handleSave = async () => {
    if (!profile?._id) return;

    try {
      setSaving(true);
      await api.patch(`/admin/students/${profile._id}`, { ...profile });
      setIsEditing(false);
      setSnack({ text: 'Saved successfully' });
      setTimeout(() => setSnack(null), 1500);
    } catch (e) {
      console.error(e);
      setSnack({ text: 'Save failed. Try again.' });
      setTimeout(() => setSnack(null), 2500);
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- Student request actions (undo) ---------------- */
  const performRequestAction = async (id: string, action: 'approve' | 'reject' | 'delete') => {
    const existing = requests.find((r) => r._id === id);
    if (!existing) return;

    // optimistic remove
    setRequests((prev) => prev.filter((r) => r._id !== id));

    // snackbar
    setSnack({
      text:
        action === 'approve'
          ? `Accepted request from ${existing.parentName}`
          : action === 'reject'
            ? `Rejected request from ${existing.parentName}`
            : `Deleted request from ${existing.parentName}`,
      action: 'Undo',
      onAction: () => {
        setRequests((prev) => [existing, ...prev]);
        setSnack(null);
        if (undoRef.current) clearTimeout(undoRef.current);
        undoRef.current = null;
      },
    });

    // call after 4s if not undone
    undoRef.current = setTimeout(async () => {
      try {
        if (action === 'approve') await api.patch(`/parent/links/${id}/approve`);
        if (action === 'reject') await api.patch(`/parent/links/${id}/reject`);
        if (action === 'delete') await api.delete(`/parent/links/${id}`);

        setSnack({ text: 'Done' });
        setTimeout(() => setSnack(null), 1200);
      } catch (e) {
        console.error(e);
        setRequests((prev) => [existing, ...prev]);
        setSnack({ text: 'Action failed. Try again.' });
        setTimeout(() => setSnack(null), 2500);
      } finally {
        undoRef.current = null;
      }
    }, 4000);
  };

  /* ---------------- Parent: add kid ---------------- */
  const addKidByCode = async () => {
    const code = kidCode.trim();
    if (!code) {
      setSnack({ text: 'Enter a student code' });
      setTimeout(() => setSnack(null), 1500);
      return;
    }

    try {
      setAddingKid(true);
      await api.post('/parent/links', { studentCode: code });
      setKidCode('');

      const pendingRes = await api.get('/parent/links/pending');
      setPendingLinks(pendingRes.data.data || []);

      setSnack({ text: 'Link request sent' });
      setTimeout(() => setSnack(null), 1500);
    } catch (e: any) {
      console.error(e);
      setSnack({ text: e?.response?.data?.message || 'Request failed' });
      setTimeout(() => setSnack(null), 2500);
    } finally {
      setAddingKid(false);
    }
  };

  const cancelPendingLink = async (id: string) => {
    const existing = pendingLinks.find((p: any) => p._id === id);
    if (!existing) return;

    setPendingLinks((prev) => prev.filter((p: any) => p._id !== id));

    try {
      await api.delete(`/parent/links/${id}`);
      setSnack({ text: 'Cancelled' });
      setTimeout(() => setSnack(null), 1200);
    } catch (e) {
      console.error(e);
      setPendingLinks((prev) => [existing, ...prev]);
      setSnack({ text: 'Cancellation failed' });
      setTimeout(() => setSnack(null), 2500);
    }
  };

  const viewChildProgress = (kid: any) => {
    const studentId = kid?.studentId._id;

    if (studentId) router.push(`profile/progress?id=${studentId}` as any);
    else router.push(`profile/progress` as any);
  };

  /* ---------------- UI computed ---------------- */

  /* ---------------- Loading ---------------- */
  if (loading) {
    return (
      <View className="flex-1 bg-background">
        <AppHeader />

        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator />
          <Text className="font-sans text-gray-600">Loading profile…</Text>
        </View>
      </View>
    );
  }

  /* ========================================================= */
  return (
    <View className="flex-1 bg-background">
      <AppHeader />
      <TopTabs
        tabs={tabs}
        active={activeTab}
        onPress={(key) => {
          setActiveTab(key);
          scrollTo(key);
        }}
      />
      <ScrollView
        className="flex-1"
        ref={scrollRef}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* ================= Top Header ================= */}
        <View className="px-4 pb-3 pt-5">
          <View className="flex-row items-center gap-3">
            <Avatar name={profile.name} />

            <View className="flex-1">
              <Text className="font-heading1 text-xl text-gray-900">
                {profile.name || 'Your Profile'}
              </Text>
              <Text className="font-sans text-sm text-gray-500">{profile.email || ''}</Text>
            </View>

            <Pill text={role.toUpperCase()} />
          </View>
        </View>

        {/* ================= Profile Card ================= */}
        <View
          className="px-4"
          onLayout={(e) => {
            sectionYRef.current['profile'] = e.nativeEvent.layout.y;
          }}>
          <Card>
            <View className="flex-row items-start justify-between gap-3">
              

              {!isEditing ? (
                <Pressable
                  onPress={() => setIsEditing(true)}
                  className="flex-row items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2">
                  <Pencil size={16} color="#0f172a" />
                  <Text className="font-sans font-bold text-gray-900">Edit</Text>
                </Pressable>
              ) : (
                <View className="flex-row items-center gap-2">
                  <Pressable
                    disabled={saving}
                    onPress={handleSave}
                    className="flex-row items-center gap-2 rounded-xl bg-primary px-4 py-2">
                    {saving ? <ActivityIndicator color="#fff" /> : <Save size={16} color="#fff" />}
                    <Text className="font-sans font-bold text-white">Save</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setIsEditing(false)}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2">
                    <Text className="font-sans font-bold text-gray-900">Cancel</Text>
                  </Pressable>
                </View>
              )}
            </View>

            

            <View className="mt-5 gap-4">
              <Row
                label="Full name"
                value={profile.name}
                editable={isEditing}
                onChangeText={(t) => handleChange('name', t)}
              />

              <Row label="Email" value={profile.email} editable={false} />

              {role === 'student' && (
                <Row label="Student ID" value={profile.studentCode} editable={false} />
              )}

              <Row
                label="Phone"
                value={profile.phone}
                editable={isEditing}
                keyboardType="phone-pad"
                onChangeText={(t) => handleChange('phone', t)}
              />

              {role === 'teacher' && (
                <Row
                  label="UPI ID"
                  value={profile.upiId}
                  editable={isEditing}
                  onChangeText={(t) => handleChange('upiId', t)}
                />
              )}

              {role === 'student' && (
                <Row
                  label="Age"
                  value={String(profile.age ?? '')}
                  editable={isEditing}
                  keyboardType="numeric"
                  onChangeText={(t) => handleChange('age', Number(t || 0))}
                />
              )}

              {/* Location */}
              <Text className="mt-2 font-sans text-sm font-extrabold text-gray-900">Location</Text>

              <View className="gap-3">
                <Row
                  label="PIN Code"
                  value={profile.pincode}
                  editable={isEditing}
                  keyboardType="numeric"
                  onChangeText={(t) => handleChange('pincode', t)}
                />
                <Row
                  label="City"
                  value={profile.city}
                  editable={isEditing}
                  onChangeText={(t) => handleChange('city', t)}
                />
                <Row
                  label="State"
                  value={profile.state}
                  editable={isEditing}
                  onChangeText={(t) => handleChange('state', t)}
                />
                <Row
                  label="Country"
                  value={profile.country}
                  editable={isEditing}
                  onChangeText={(t) => handleChange('country', t)}
                />
              </View>
            </View>
          </Card>
        </View>

        {/* ================= Student: Requests ================= */}
        {role === 'student' && (
          <View
            className="mt-4 px-4"
            onLayout={(e) => {
              sectionYRef.current['requests'] = e.nativeEvent.layout.y;
            }}>
            <Card>
              <View className="flex-row items-center justify-between">
                <Text className="font-heading2 text-lg text-gray-900">Requests</Text>
                <Text className="font-sans text-sm text-gray-500">
                  {loadingRequests ? 'Loading…' : `${requests.length} pending`}
                </Text>
              </View>

              <View className="mt-3 gap-2">
                {loadingRequests ? (
                  <View className="items-center py-8">
                    <ActivityIndicator />
                  </View>
                ) : requests.length === 0 ? (
                  <Text className="font-sans text-sm text-gray-500">No pending requests</Text>
                ) : (
                  requests.map((r) => (
                    <View
                      key={r._id}
                      className="flex-row items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                      <View className="flex-1 flex-row items-center gap-3">
                        <Avatar name={r.parentName} />
                        <View className="flex-1">
                          <Text className="font-sans font-extrabold text-gray-900">
                            {r.parentName}
                          </Text>
                          <Text className="font-sans text-xs text-gray-500">
                            {r.parentEmail || 'Wants to link'} • {formatDate(r.createdAt)}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row items-center gap-2">
                        <Pressable
                          onPress={() => performRequestAction(r._id, 'approve')}
                          className="h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                          <Check size={18} color="#16a34a" />
                        </Pressable>

                        <Pressable
                          onPress={() => performRequestAction(r._id, 'reject')}
                          className="h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                          <X size={18} color="#dc2626" />
                        </Pressable>

                        <Pressable
                          onPress={() => performRequestAction(r._id, 'delete')}
                          className="h-10 w-10 items-center justify-center rounded-xl bg-gray-200">
                          <Trash size={18} color="#334155" />
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </Card>
          </View>
        )}

        {/* ================= Student: Recent ================= */}
        {role === 'student' && (
          <View
            className="mt-4 px-4"
            onLayout={(e) => {
              sectionYRef.current['recent'] = e.nativeEvent.layout.y;
            }}>
            <Card>
              <View className="flex-row items-center justify-between">
                <Text className="font-heading2 text-lg text-gray-900">Recent</Text>

                <Pressable
                  onPress={() => router.push('/(tabs)/profile/progress' as any)}
                  className="flex-row items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <Text className="font-sans font-bold text-gray-900">View</Text>
                  <ArrowRight size={16} color="#0f172a" />
                </Pressable>
              </View>

              <View className="mt-3 gap-2">
                {loadingRecent ? (
                  <View className="items-center py-4">
                    <ActivityIndicator />
                  </View>
                ) : recent.length === 0 ? (
                  <Text className="font-sans text-sm text-gray-500">No recent activity yet</Text>
                ) : (
                  recent
                    .slice()
                    .sort(
                      (a, b) =>
                        new Date(b.updatedAt || '').getTime() -
                        new Date(a.updatedAt || '').getTime()
                    )
                    .slice(0, 5)
                    .map((it) => (
                      <Pressable
                        key={it._id}
                        onPress={() =>
                          router.push(`/(tabs)/home/content/${it.contentId._id}` as any)
                        }
                        className="rounded-2xl border border-gray-200 bg-white px-3 py-2"
                        style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
                        <View className="flex-row gap-3">
                          {/* Thumbnail */}
                          <View className="aspect-video w-24 overflow-hidden rounded border-gray-200 bg-gray-100">
                            {it.contentId.thumbnailKey ? (
                              <Image
                                source={{ uri: `${AWS_URL}/${it.contentId.thumbnailKey}` }}
                                className="aspect-video h-full w-full"
                                resizeMode="contain"
                              />
                            ) : (
                              <View className="flex-1 items-center justify-center bg-primary/10">
                                <Text className="font-heading2 text-primary">
                                  {(it.contentId.title || 'C').slice(0, 2).toUpperCase()}
                                </Text>
                              </View>
                            )}
                          </View>

                          {/* Right */}
                          <View className="flex-1">
                            <View className="flex-row items-center justify-between gap-2">
                              <View className="flex-1">
                                <Text
                                  className="font-heading2 text-sm text-gray-900"
                                  numberOfLines={2}>
                                  {it.contentId.title}
                                </Text>
                              </View>

                              {/* Status */}
                              {it.status === 'completed' ? (
                                <Pill tone="green" text="Done" />
                              ) : (
                                <Pill tone="yellow" text="Ongoing" />
                              )}
                            </View>

                            {/* Progress Bar */}
                            {it.contentId.type === 'video' &&
                              typeof it.progressPercent === 'number' && (
                                <View className="mt-3">
                                  <View className="h-2 overflow-hidden rounded-full bg-gray-200">
                                    <View
                                      className="h-2 rounded-full bg-green-500"
                                      style={{
                                        width: `${Math.max(
                                          0,
                                          Math.min(100, Math.round(it.progressPercent))
                                        )}%`,
                                      }}
                                    />
                                  </View>

                                  <Text className="mt-1 font-sans text-[11px] font-semibold text-gray-500">
                                    {Math.round(it.progressPercent)}% watched
                                  </Text>
                                </View>
                              )}
                          </View>
                        </View>
                      </Pressable>
                    ))
                )}
              </View>
            </Card>
          </View>
        )}

        {/* ================= Parent: Kids ================= */}
        {role === 'parent' && (
          <View
            className="mt-4 px-4"
            onLayout={(e) => {
              sectionYRef.current['kids'] = e.nativeEvent.layout.y;
            }}>
            <Card>
              <View className="flex-row items-center justify-between">
                <Text className="font-heading2 text-lg text-gray-900">Your Kids</Text>
                <Text className="font-sans text-sm text-gray-500">
                  {loadingKids ? 'Loading…' : `${kids.length} linked`}
                </Text>
              </View>

              <View className="mt-3 gap-2">
                {loadingKids ? (
                  <View className="items-center py-8">
                    <ActivityIndicator />
                  </View>
                ) : kids.length === 0 ? (
                  <Text className="font-sans text-sm text-gray-500">No kids linked yet</Text>
                ) : (
                  kids.map((kid: any) => {
                    const student = kid.studentId || {};
                    const name = student.name || 'Student';
                    const code = student.studentCode || kid.studentCode || '-';

                    return (
                      <View
                        key={kid._id || code}
                        className="flex-row items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                        <View className="flex-1 flex-row items-center gap-3">
                          <Avatar name={name} />
                          <View className="flex-1">
                            <Text className="font-heading1 text-gray-900">{name}</Text>
                            <Text className="font-sans text-xs text-gray-500">{code}</Text>
                          </View>
                        </View>

                        <Pressable
                          onPress={() => viewChildProgress(kid)}
                          className="flex-row items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
                          <Text className="font-sans text-gray-900">Progress</Text>
                          <ArrowRight size={16} color="#0f172a" />
                        </Pressable>
                      </View>
                    );
                  })
                )}
              </View>

              {/* Add kid */}
              <View className="mt-5">
                <Text className="mb-2 font-sans text-gray-900">Add a kid</Text>

                <View className="flex-row items-center gap-2">
                  <View className="h-12 flex-1 justify-center rounded-xl border border-gray-300 bg-gray-50 px-3">
                    <TextInput
                      value={kidCode}
                      onChangeText={setKidCode}
                      placeholder="Enter student code"
                      placeholderTextColor="#9CA3AF"
                      className="font-sans text-sm text-gray-900"
                    />
                  </View>

                  <Pressable
                    disabled={addingKid}
                    onPress={addKidByCode}
                    className="h-12 flex-row items-center justify-center gap-2 rounded-xl bg-primary px-4">
                    {addingKid ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Plus size={18} color="#fff" />
                    )}
                    <Text className="font-heading1 text-white">Add</Text>
                  </Pressable>
                </View>
              </View>

              {/* Pending */}
              <View
                className="mt-6"
                onLayout={(e) => {
                  sectionYRef.current['pending'] = e.nativeEvent.layout.y;
                }}>
                <Text className="mb-2 font-sans text-gray-900">Pending Requests</Text>

                {pendingLinks.length === 0 ? (
                  <Text className="font-sans text-sm text-gray-500">No pending link requests</Text>
                ) : (
                  <View className="gap-2">
                    {pendingLinks.map((p: any) => (
                      <View
                        key={p._id}
                        className="flex-row items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-3">
                        <View className="flex-1">
                          <Text className="font-sans font-bold text-gray-900">
                            {p.student?.name || p.studentId?.name || p.studentCode}
                          </Text>
                          <Text className="mt-1 font-sans text-xs text-gray-500">
                            {formatDate(p.createdAt)}
                          </Text>
                        </View>

                        <Pressable
                          onPress={() => cancelPendingLink(p._id)}
                          className="rounded-xl bg-red-100 px-3 py-2">
                          <Text className="font-sans font-bold text-red-700">Cancel</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </Card>
          </View>
        )}

        {/* ================= Teacher ================= */}
        {role === 'teacher' && (
          <View className="mt-4 px-4">
            <Card>
              <Text className="font-heading2 text-lg text-gray-900">Teacher Dashboard</Text>
              <Text className="mt-2 font-sans text-sm text-gray-500">
                Your teacher profile is ready. (UPI ID + phone can be edited in the profile
                section.)
              </Text>
            </Card>
          </View>
        )}
      </ScrollView>

      <SnackBar snack={snack} onClose={() => setSnack(null)} />
    </View>
  );
}
