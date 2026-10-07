import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit as fsLimit,
  getCountFromServer,
  increment,
  type QueryConstraint,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/services/firebase/config";

/**
 * Firestore service - Document 04.
 * Generic, typed helpers used by every module's data layer
 * (articles, players, teams, etc.) so components never call
 * Firestore directly. Errors are always re-thrown as friendly,
 * non-technical messages - never expose raw Firebase errors.
 */

function toFriendlyFirestoreError(): string {
  return "We couldn't load this content right now. Please try again.";
}

export interface QueryOptions {
  where?: [string, "==" | "!=" | ">" | ">=" | "<" | "<=" | "in", unknown][];
  orderBy?: [string, "asc" | "desc"];
  limit?: number;
}

export async function getDocumentById<T>(
  collectionName: string,
  id: string
): Promise<T | null> {
  try {
    const snapshot = await getDoc(doc(db, collectionName, id));
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() } as T;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[firestore] getDocumentById(${collectionName}, ${id})`, err);
    throw new Error(toFriendlyFirestoreError());
  }
}

export async function getCollectionDocs<T>(
  collectionName: string,
  options: QueryOptions = {}
): Promise<T[]> {
  try {
    const constraints: QueryConstraint[] = [];

    for (const [field, op, value] of options.where ?? []) {
      constraints.push(where(field, op, value));
    }
    if (options.orderBy) {
      constraints.push(orderBy(options.orderBy[0], options.orderBy[1]));
    }
    if (options.limit) {
      constraints.push(fsLimit(options.limit));
    }

    const q = query(collection(db, collectionName), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as T
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[firestore] getCollectionDocs(${collectionName})`, err);
    throw new Error(toFriendlyFirestoreError());
  }
}

export async function getCollectionCount(
  collectionName: string,
  options: Pick<QueryOptions, "where"> = {}
): Promise<number> {
  try {
    const constraints: QueryConstraint[] = [];
    for (const [field, op, value] of options.where ?? []) {
      constraints.push(where(field, op, value));
    }
    const q = query(collection(db, collectionName), ...constraints);
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[firestore] getCollectionCount(${collectionName})`, err);
    throw new Error(toFriendlyFirestoreError());
  }
}

/**
 * Looks up a single document by its `slug` field rather than its ID -
 * every public detail page (article, player, team, league) is
 * reached via a slug URL, so this is the standard lookup for them.
 */
export async function getDocumentBySlug<T extends { createdAt?: number }>(
  collectionName: string,
  slug: string
): Promise<T | null> {
  try {
    // Fetch a few matches (not just 1) and sort client-side rather than
    // adding an orderBy to the query - an equality-only filter needs no
    // composite index, but equality + orderBy on a different field
    // would require one to exist in Firestore for every collection this
    // is used on. If a duplicate slug ever exists (e.g. a doc created
    // both by the import tool and manually in the dashboard), this
    // still resolves deterministically to the OLDEST one instead of
    // whichever one Firestore happens to return first.
    const results = await getCollectionDocs<T>(collectionName, {
      where: [["slug", "==", slug]],
      limit: 5,
    });
    if (results.length === 0) return null;
    results.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
    return results[0];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[firestore] getDocumentBySlug(${collectionName}, ${slug})`, err);
    throw new Error(toFriendlyFirestoreError());
  }
}

/**
 * Atomically increments a numeric field - used for article view
 * counts, wallpaper download counts, and quiz play counts, so
 * concurrent visitors never overwrite each other's counts.
 */
export async function incrementField(
  collectionName: string,
  id: string,
  field: string,
  amount = 1
): Promise<void> {
  try {
    await updateDoc(doc(db, collectionName, id), { [field]: increment(amount) });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[firestore] incrementField(${collectionName}, ${id}, ${field})`, err);
    // Non-fatal - view/download/play counts are best-effort, never block the user.
  }
}

export async function createDocument(
  collectionName: string,
  data: DocumentData
): Promise<string> {
  try {
    const ref = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDeleted: false,
    });
    return ref.id;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[firestore] createDocument(${collectionName})`, err);
    throw new Error("We couldn't save this. Please try again.");
  }
}

/**
 * Creates or overwrites a document at a known, fixed ID - used for
 * singleton documents like the homepage config or site settings,
 * where there's exactly one document and its ID is always the same.
 */
export async function setDocumentById(
  collectionName: string,
  id: string,
  data: DocumentData
): Promise<void> {
  try {
    await setDoc(
      doc(db, collectionName, id),
      { ...data, updatedAt: Date.now() },
      { merge: true }
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[firestore] setDocumentById(${collectionName}, ${id})`, err);
    throw new Error("We couldn't save your changes. Please try again.");
  }
}

export async function updateDocumentById(
  collectionName: string,
  id: string,
  data: DocumentData
): Promise<void> {
  try {
    await updateDoc(doc(db, collectionName, id), {
      ...data,
      updatedAt: Date.now(),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[firestore] updateDocumentById(${collectionName}, ${id})`, err);
    throw new Error("We couldn't save your changes. Please try again.");
  }
}

/** Soft delete - moves a document to Trash instead of permanently deleting it. */
export async function softDeleteDocument(
  collectionName: string,
  id: string
): Promise<void> {
  try {
    await updateDoc(doc(db, collectionName, id), {
      isDeleted: true,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[firestore] softDeleteDocument(${collectionName}, ${id})`, err);
    throw new Error("We couldn't delete this. Please try again.");
  }
}

/** Permanently deletes a document. Only used from the Trash module. */
export async function permanentlyDeleteDocument(
  collectionName: string,
  id: string
): Promise<void> {
  try {
    await deleteDoc(doc(db, collectionName, id));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[firestore] permanentlyDeleteDocument(${collectionName}, ${id})`, err);
    throw new Error("We couldn't delete this. Please try again.");
  }
}
