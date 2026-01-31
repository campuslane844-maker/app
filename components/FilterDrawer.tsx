import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  Animated,
  Dimensions,
  ScrollView,
  Switch,
} from 'react-native';
import { X, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '@/lib/api';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = SCREEN_WIDTH * 0.85;

/* ---------- Types ---------- */
type ClassItem = { _id: string; name: string };
type SubjectItem = { _id: string; name: string };
type ChapterItem = { _id: string; name: string };

type Filters = {
  classId?: string;
  subjectId?: string;
  chapterId?: string;
  paid?: boolean;
};

interface FilterDrawerProps {
  visible: boolean;
  filters: Filters;
  onChange: (partial: Partial<Filters>) => void;
  onClose: () => void;
}

export default function FilterDrawer({ visible, filters, onChange, onClose }: FilterDrawerProps) {
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(DRAWER_WIDTH)).current;

  /* ---------- Data ---------- */
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);

  /* ---------- Animation ---------- */
  useEffect(() => {
    Animated.timing(translateX, {
      toValue: visible ? 0 : DRAWER_WIDTH,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  /* ---------- Fetch Classes ---------- */
  useEffect(() => {
    api.get('/classes').then((res) => {
      setClasses(res.data?.data || []);
    });
  }, []);

  /* ---------- Fetch Subjects (dependent) ---------- */
  useEffect(() => {
    setSubjects([]);
    setChapters([]);

    if (!filters.classId) return;

    api
      .get('/subjects', {
        params: { classId: filters.classId, limit: 200 },
      })
      .then((res) => {
        setSubjects(res.data?.data || []);
      });
  }, [filters.classId]);

  /* ---------- Fetch Chapters (dependent) ---------- */
  useEffect(() => {
    setChapters([]);

    if (!filters.subjectId) return;

    api
      .get('/chapters', {
        params: { subjectId: filters.subjectId, limit: 500 },
      })
      .then((res) => {
        setChapters(res.data?.data || []);
      });
  }, [filters.subjectId]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none">
      {/* Backdrop */}
      <Pressable onPress={onClose} className="absolute inset-0 bg-black/40" />

      {/* Drawer */}
      <Animated.View
        style={{
          width: DRAWER_WIDTH,
          transform: [{ translateX }],
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
        className="absolute bottom-0 right-0 top-0 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-gray-200 px-5 py-4">
          <Text className="font-heading1 text-lg">Filters</Text>

          <View className="flex-row items-center gap-4">
            <Pressable
              onPress={() =>
                onChange({
                  classId: undefined,
                  subjectId: undefined,
                  chapterId: undefined,
                  paid: undefined,
                })
              }>
              <Text className="rounded-full border border-gray-300 p-1 px-3 font-sans text-xs font-semibold text-gray-700">
                Reset
              </Text>
            </Pressable>

            <Pressable onPress={onClose}>
              <X size={22} />
            </Pressable>
          </View>
        </View>

        {/* Content */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
          {/* Class */}
          <FilterSection title="Class">
            {classes.map((c) => (
              <FilterRow
                key={c._id}
                label={c.name}
                selected={filters.classId === c._id}
                onPress={() =>
                  onChange({
                    classId: c._id,
                    subjectId: undefined,
                    chapterId: undefined,
                  })
                }
              />
            ))}
          </FilterSection>

          {/* Subject */}
          <FilterSection title="Subject">
            {!filters.classId ? (
              <DisabledText text="Select class first" />
            ) : (
              subjects.map((s) => (
                <FilterRow
                  key={s._id}
                  label={s.name}
                  selected={filters.subjectId === s._id}
                  onPress={() =>
                    onChange({
                      subjectId: s._id,
                      chapterId: undefined,
                    })
                  }
                />
              ))
            )}
          </FilterSection>

          {/* Chapter */}
          <FilterSection title="Chapter">
            {!filters.subjectId ? (
              <DisabledText text="Select subject first" />
            ) : (
              chapters.map((ch) => (
                <FilterRow
                  key={ch._id}
                  label={ch.name}
                  selected={filters.chapterId === ch._id}
                  onPress={() => onChange({ chapterId: ch._id })}
                />
              ))
            )}
          </FilterSection>

          {/* Pricing */}
          <FilterSection title="Availability">
            <ToggleRow
              label="Locked"
              value={filters.paid === true}
              onChange={(v) => onChange({ paid: v ? true : undefined })}
            />
            <ToggleRow
              label="Unlocked"
              value={filters.paid === false}
              onChange={(v) => onChange({ paid: v ? false : undefined })}
            />
          </FilterSection>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

/* ================= UI PARTS ================= */

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Text className="mb-3 font-sans text-sm font-bold text-gray-600">{title}</Text>
      <View className="gap-2">{children}</View>
    </View>
  );
}

function FilterRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center justify-between rounded-xl border px-4 py-3 ${
        selected ? 'border-primary bg-primary/10' : 'border-gray-200'
      }`}>
      <Text className="font-sans">{label}</Text>
      {selected && <ChevronRight size={18} />}
    </Pressable>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="font-sans">{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

function DisabledText({ text }: { text: string }) {
  return <Text className="text-sm italic text-gray-400">{text}</Text>;
}
