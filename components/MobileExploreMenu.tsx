import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, FlatList } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ChevronRight, ArrowLeft } from "lucide-react-native";
import api from "@/lib/api";
import { useRouter } from "expo-router";

type ClassItem = { _id: string; name: string };
type SubjectItem = { _id: string; name: string };
type ChapterItem = { _id: string; name: string };

export default function MobileExploreMenu({
  onClose,
}: {
  onClose: () => void;
}) {
  const navigation = useNavigation<any>();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);

  const [activeClass, setActiveClass] = useState<ClassItem | null>(null);
  const [activeSubject, setActiveSubject] = useState<SubjectItem | null>(null);

  /* ---------------- Fetch Classes ---------------- */
  useEffect(() => {
    api.get("/classes").then((res) => {
      setClasses(res.data.data || []);
    });
  }, []);

  /* ---------------- Fetch Subjects ---------------- */
  useEffect(() => {
    if (!activeClass) return;
    api
      .get("/subjects", { params: { classId: activeClass._id } })
      .then((res) => setSubjects(res.data.data || []));
  }, [activeClass]);

  /* ---------------- Fetch Chapters ---------------- */
  useEffect(() => {
    if (!activeSubject) return;
    api
      .get("/chapters", { params: { subjectId: activeSubject._id } })
      .then((res) => setChapters(res.data.data || []));
  }, [activeSubject]);

  /* ================= LEVEL 1: CLASSES ================= */
  if (!activeClass) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>CLASSES</Text>

      {classes.map((item) => (
        <Pressable
          key={item._id}
          style={styles.row}
          onPress={() => {
            setActiveClass(item);
            setActiveSubject(null);
          }}
        >
          <Text style={styles.rowText}>{item.name}</Text>
          <ChevronRight size={16} color="#9CA3AF" />
        </Pressable>
      ))}
    </View>
  );
}

  /* ================= LEVEL 2: SUBJECTS ================= */
  if (activeClass && !activeSubject) {
    return (
      <View style={styles.container}>
        <Pressable
          style={styles.backBtn}
          onPress={() => setActiveClass(null)}
        >
          <ArrowLeft size={16} color="#4B5563" />
          <Text style={styles.backText}>Back to Classes</Text>
        </Pressable>

        <Text style={styles.heading}>
          SUBJECTS – {activeClass.name}
        </Text>

        {subjects.map((sub) => (
          <Pressable
            key={sub._id}
            style={styles.row}
            onPress={() => setActiveSubject(sub)}
          >
            <Text style={styles.rowText}>{sub.name}</Text>
            <ChevronRight size={16} color="#9CA3AF" />
          </Pressable>
        ))}
      </View>
    );
  }

  const router = useRouter();

  /* ================= LEVEL 3: CHAPTERS ================= */
  return (
    <View style={styles.container}>
      <Pressable
        style={styles.backBtn}
        onPress={() => setActiveSubject(null)}
      >
        <ArrowLeft size={16} color="#4B5563" />
        <Text style={styles.backText}>Back to Subjects</Text>
      </Pressable>

      <Text style={styles.heading}>
        CHAPTERS – {activeSubject?.name}
      </Text>

      {chapters.map((ch) => (
        <Pressable
          key={ch._id}
          style={styles.chapterCard}
          onPress={() => {
            router.push(
              `/worksheet-zone/classes/${activeClass._id}/subjects/${activeSubject?._id}/chapters/${ch._id}`
            )
            onClose();
            console.log(`/worksheet-zone/classes/${activeClass._id}/subjects/${activeSubject?._id}/chapters/${ch._id}`)
          }}
        >
          <Text style={styles.rowText}>{ch.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 6,
  },
  heading: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
    marginBottom: 6,
    fontFamily: 'DM Sans'
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
  },
  rowText: {
    fontSize: 14,
    color: "#111827",
    fontFamily: 'DM Sans'
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backText: {
    fontSize: 14,
    color: "#4B5563",
    fontFamily: 'DM Sans'
  },
  chapterCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
});
