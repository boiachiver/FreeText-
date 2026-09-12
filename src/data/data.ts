import type { Person, Post } from "../types/types";

export const starterPosts: Post[] = [
  {
    id: "1",
    name: "Boi Achiver",
    username: "boiachiver",
    avatar: "https://i.pravatar.cc/150?img=12",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    caption: "Building FreeText one step at a time 🚀",
    likes: 128,
    comments: 24,
    liked: false,
    saved: false,
    time: "2h",
  },
  {
    id: "2",
    name: "Maya Johnson",
    username: "mayaj",
    avatar: "https://i.pravatar.cc/150?img=47",
    image:
      "https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=1200&q=80",
    caption: "Good energy. Good people. Good memories. ✨",
    likes: 94,
    comments: 13,
    liked: false,
    saved: false,
    time: "4h",
  },
  {
    id: "3",
    name: "Daniel Carter",
    username: "dcarter",
    avatar: "https://i.pravatar.cc/150?img=33",
    image:
      "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=80",
    caption: "Sometimes you just need to enjoy the journey 🌍",
    likes: 211,
    comments: 31,
    liked: false,
    saved: false,
    time: "6h",
  },
];

export const suggestions: Person[] = [
  {
    name: "Sophia Williams",
    username: "sophiaw",
    avatar: "https://i.pravatar.cc/150?img=32",
  },
  {
    name: "Chris Brown",
    username: "chrisb",
    avatar: "https://i.pravatar.cc/150?img=11",
  },
  {
    name: "Aisha Smith",
    username: "aishas",
    avatar: "https://i.pravatar.cc/150?img=44",
  },
];

export const defaultProfile = {
  name: "Boi Achiver",
  username: "boiachiver",
  bio: "Building, sharing and connecting on FreeText 🌐",
  avatar: "https://i.pravatar.cc/150?img=12",
  coverPhoto:
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80",
};
