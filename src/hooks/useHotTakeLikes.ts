import { useCallback, useEffect, useState } from "react";
import { incrementField } from "@/services/firebase/firestore";

const STORAGE_KEY = "dg-tribune-liked-hot-takes";

function readLikedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set<string>(JSON.parse(raw) as string[]) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

function writeLikedIds(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore - likes just won't persist across visits for this user
  }
}

/**
 * useHotTakeLikes - same pattern as useWallpaperLikes: no visitor
 * login, so "liked" state is per-browser via localStorage, while the
 * like COUNT itself lives in Firestore so everyone sees the same
 * real total.
 */
export function useHotTakeLikes() {
  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set<string>());

  useEffect(() => {
    setLikedIds(readLikedIds());
  }, []);

  const isLiked = useCallback((id: string) => likedIds.has(id), [likedIds]);

  const toggleLike = useCallback(
    (id: string) => {
      const next = new Set<string>(likedIds);
      const wasLiked = next.has(id);
      if (wasLiked) {
        next.delete(id);
      } else {
        next.add(id);
      }
      setLikedIds(next);
      writeLikedIds(next);
      incrementField("shortUpdates", id, "likeCount", wasLiked ? -1 : 1);
      return !wasLiked;
    },
    [likedIds]
  );

  return { isLiked, toggleLike };
}
