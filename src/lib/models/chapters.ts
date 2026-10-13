import { ObjectId, Collection } from "mongodb";
import { getDatabase } from "../mongodb";

export interface Chapter {
  _id?: ObjectId;
  novelId: ObjectId;
  name: string;
  chap: number;
  content: string;
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChapterWithId extends Chapter {
  _id: ObjectId;
}

let indexesEnsured = false;

async function getCollection(): Promise<Collection<Chapter>> {
  const db = await getDatabase();
  const collection = db.collection<Chapter>("chapters");

  if (!indexesEnsured) {
    indexesEnsured = true;
    collection.createIndex({ novelId: 1, chap: 1 }).catch((err) => {
      console.warn("Failed to create index on chapters collection:", err);
    });
  }

  return collection;
}

export async function createChapter(
  chapter: Omit<Chapter, "_id" | "createdAt" | "updatedAt">
): Promise<ChapterWithId> {
  const collection = await getCollection();
  const now = new Date();
  const newChapter: Chapter = {
    ...chapter,
    createdAt: now,
    updatedAt: now,
  };
  const result = await collection.insertOne(newChapter);
  return { ...newChapter, _id: result.insertedId };
}

export async function createManyChapters(
  chapters: Omit<Chapter, "_id" | "createdAt" | "updatedAt">[]
): Promise<ObjectId[]> {
  if (chapters.length === 0) return [];

  const collection = await getCollection();
  const now = new Date();
  const chaptersWithDates = chapters.map((chapter) => ({
    ...chapter,
    createdAt: now,
    updatedAt: now,
  }));

  const BATCH_SIZE = 200;
  const insertedIds: ObjectId[] = [];

  for (let i = 0; i < chaptersWithDates.length; i += BATCH_SIZE) {
    const batch = chaptersWithDates.slice(i, i + BATCH_SIZE);
    const result = await collection.insertMany(batch, { ordered: false });
    insertedIds.push(...Object.values(result.insertedIds));
  }

  return insertedIds;
}

export async function getChaptersByNovelId(
  novelId: string,
  includeContent = false
): Promise<ChapterWithId[]> {
  const collection = await getCollection();
  const projection = includeContent
    ? {}
    : {
        _id: 1,
        novelId: 1,
        name: 1,
        chap: 1,
        wordCount: 1,
        createdAt: 1,
        updatedAt: 1,
      };

  return collection
    .find({ novelId: new ObjectId(novelId) }, { projection })
    .sort({ chap: 1 })
    .toArray() as Promise<ChapterWithId[]>;
}

export async function getChapterById(
  id: string
): Promise<ChapterWithId | null> {
  const collection = await getCollection();
  return collection.findOne({
    _id: new ObjectId(id),
  }) as Promise<ChapterWithId | null>;
}

export async function getChapterByNovelAndNumber(
  novelId: string,
  chapterNumber: number
): Promise<ChapterWithId | null> {
  const collection = await getCollection();
  return collection.findOne({
    novelId: new ObjectId(novelId),
    chap: chapterNumber,
  }) as Promise<ChapterWithId | null>;
}

export async function deleteChaptersByNovelId(
  novelId: string
): Promise<number> {
  const collection = await getCollection();
  const result = await collection.deleteMany({
    novelId: new ObjectId(novelId),
  });
  return result.deletedCount;
}

export async function getAdjacentChapters(
  novelId: string,
  currentChapter: number
): Promise<{
  prev: { _id: ObjectId; chap: number } | null;
  next: { _id: ObjectId; chap: number } | null;
}> {
  const collection = await getCollection();
  const novelObjId = new ObjectId(novelId);

  const [prev, next] = await Promise.all([
    collection.findOne(
      {
        novelId: novelObjId,
        chap: currentChapter - 1,
      },
      { projection: { _id: 1, chap: 1 } }
    ),
    collection.findOne(
      {
        novelId: novelObjId,
        chap: currentChapter + 1,
      },
      { projection: { _id: 1, chap: 1 } }
    ),
  ]);

  return {
    prev: prev ? { _id: prev._id, chap: prev.chap } : null,
    next: next ? { _id: next._id, chap: next.chap } : null,
  };
}
