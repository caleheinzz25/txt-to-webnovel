import { ObjectId, Collection } from "mongodb";
import { getDatabase } from "../mongodb";

export interface Novel {
  _id?: ObjectId;
  name: string;
  totalChapters: number;
  totalWords: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NovelWithId extends Novel {
  _id: ObjectId;
}

async function getCollection(): Promise<Collection<Novel>> {
  const db = await getDatabase();
  return db.collection<Novel>("novels");
}

export async function createNovel(
  novel: Omit<Novel, "_id" | "createdAt" | "updatedAt">
): Promise<NovelWithId> {
  const collection = await getCollection();
  const now = new Date();
  const newNovel: Novel = {
    ...novel,
    createdAt: now,
    updatedAt: now,
  };
  const result = await collection.insertOne(newNovel);
  return { ...newNovel, _id: result.insertedId };
}

export async function getAllNovels(
  search?: string,
  sortBy: string = "createdAt",
  sortOrder: "asc" | "desc" = "desc"
): Promise<NovelWithId[]> {
  const collection = await getCollection();
  const query = search ? { name: { $regex: search, $options: "i" } } : {};
  const sortDirection = sortOrder === "asc" ? 1 : -1;

  return collection
    .find(query)
    .sort({ [sortBy]: sortDirection })
    .toArray() as Promise<NovelWithId[]>;
}

export async function getNovelById(id: string): Promise<NovelWithId | null> {
  const collection = await getCollection();
  return collection.findOne({
    _id: new ObjectId(id),
  }) as Promise<NovelWithId | null>;
}

export async function updateNovel(
  id: string,
  update: Partial<Novel>
): Promise<boolean> {
  const collection = await getCollection();
  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { ...update, updatedAt: new Date() } }
  );
  return result.modifiedCount > 0;
}

export async function deleteNovel(id: string): Promise<boolean> {
  const collection = await getCollection();
  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}
