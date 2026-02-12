import { BookOpen, Download, Gamepad2Icon, Paintbrush2, Puzzle, Sparkles, Sprout } from "lucide-react-native";

export const QUICK_LINKS = [
  {
    label: 'Fun Break',
    href: '/fun-break',
    desc: 'Short activities to relax',
    bg: 'bg-yellow-50',
    icon: Sparkles,
  },
  {
    label: 'Worksheet Zone',
    href: '/worksheet-zone/classes',
    desc: 'Explore study material',
    bg: 'bg-green-50',
    icon: Download,
  },
  {
    label: 'Vocabulary',
    href: '/(tabs)/explore/coming-soon',
    desc: 'Learn new words',
    bg: 'bg-pink-50',
    icon: BookOpen,
  },
  {
    label: 'Yoga Zone',
    href: '/(tabs)/explore/coming-soon',
    desc: 'Learn yoga asanas daily',
    bg: 'bg-orange-50',
    icon: Sprout,
  },
  {
    label: 'Spoken English Zone',
    href: '/(tabs)/explore/coming-soon',
    desc: 'Watch interactive lessons',
    bg: 'bg-purple-50',
    icon: Puzzle,
  },
  {
    label: 'Art Lab',
    href: '/(tabs)/explore/coming-soon',
    desc: 'Learn art and craft',
    bg: 'bg-red-50',
    icon: Paintbrush2,
  },
  {
    label: 'Learn & Play',
    href: '/(tabs)/explore/coming-soon',
    desc: 'Interactive learning games',
    bg: 'bg-blue-50',
    icon: Gamepad2Icon,
  },
];
