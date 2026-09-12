export type Page =
  | "home"
  | "explore"
  | "messages"
  | "notifications"
  | "profile";

export type Post = {
  id: string;
  name: string;
  username: string;
  avatar: string;
  image: string;
  caption: string;
  likes: number;
  comments: number;
  liked: boolean;
  saved: boolean;
  time: string;
};

export type Person = {
  name: string;
  username: string;
  avatar: string;
};

export type ProfileData = {
  name: string;
  username: string;
  bio: string;
  avatar: string;
  coverPhoto: string;
};
