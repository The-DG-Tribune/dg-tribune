import { useCallback, useEffect, useState } from "react";
import type { Category } from "@/types/firestore";
import {
  getCollectionDocs,
  createDocument,
} from "@/services/firebase/firestore";
import { slugify } from "@/utils/slugify";

const DEFAULT_COLORS = ["#00E676", "#3B82F6", "#F59E0B", "#EF4444"];

/**
 * useCategories - shared by the Article editor (and later Short
 * Updates, Wallpapers, etc.) to load existing categories and create
 * new ones inline, without a separate Categories management screen.
 */
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getCollectionDocs<Category>("categories", {
        orderBy: ["name", "asc"],
      });
      setCategories(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createCategory(name: string): Promise<Category> {
    const id = await createDocument("categories", {
      name,
      slug: slugify(name),
      colorHex:
        DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
      status: "published",
    });
    const newCategory: Category = {
      id,
      name,
      slug: slugify(name),
      colorHex: "#00E676",
      status: "published",
      isDeleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deletedAt: null,
    };
    setCategories((prev) =>
      [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name))
    );
    return newCategory;
  }

  return { categories, isLoading, createCategory, reload: load };
}
