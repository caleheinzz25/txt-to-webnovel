import { createFileRoute } from '@tanstack/solid-router'
import { getChapterById, getAdjacentChapters } from '../../lib/models/chapters'
import { getNovelById } from '../../lib/models/novels'

// In-memory cache for novel metadata to avoid repeated DB hits on every chapter read
const novelCache = new Map<string, { name: string; totalChapters: number }>()

async function getCachedNovel(novelId: string) {
  if (novelCache.has(novelId)) {
    return novelCache.get(novelId)!
  }
  const novel = await getNovelById(novelId)
  const data = {
    name: novel?.name || 'Unknown Novel',
    totalChapters: novel?.totalChapters || 0,
  }
  if (novel) {
    novelCache.set(novelId, data)
  }
  return data
}

export const Route = createFileRoute('/api/chapters/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { id } = params
          const chapter = await getChapterById(id)

          if (!chapter) {
            return Response.json(
              { success: false, message: 'Chapter not found' },
              { status: 404 }
            )
          }

          const novelIdStr = chapter.novelId.toString()

          // Fetch novel info (from cache) and adjacent chapters in parallel
          const [novel, { prev, next }] = await Promise.all([
            getCachedNovel(novelIdStr),
            getAdjacentChapters(novelIdStr, chapter.chap),
          ])

          return Response.json({
            success: true,
            data: {
              _id: chapter._id.toString(),
              novelId: novelIdStr,
              novelName: novel?.name || 'Unknown Novel',
              totalChapters: novel?.totalChapters || 0,
              name: chapter.name,
              chap: chapter.chap,
              content: chapter.content,
              wordCount: chapter.wordCount,
              createdAt: chapter.createdAt,
              updatedAt: chapter.updatedAt,
              navigation: {
                prevId: prev?._id.toString() || null,
                prevChap: prev?.chap || null,
                nextId: next?._id.toString() || null,
                nextChap: next?.chap || null,
              },
            },
          })
        } catch (error) {
          console.error('Error fetching chapter:', error)
          return Response.json(
            { success: false, message: 'Failed to fetch chapter' },
            { status: 500 }
          )
        }
      },
    },
  },
})
