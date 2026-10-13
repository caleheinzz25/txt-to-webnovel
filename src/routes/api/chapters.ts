import { createFileRoute } from '@tanstack/solid-router'
import { getChaptersByNovelId } from '../../lib/models/chapters'

export const Route = createFileRoute('/api/chapters')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const novelId = url.searchParams.get('novelId')

          if (!novelId) {
            return Response.json(
              { success: false, message: 'novelId parameter is required' },
              { status: 400 }
            )
          }

          const chapters = await getChaptersByNovelId(novelId, false)

          return Response.json({
            success: true,
            data: chapters.map((ch) => ({
              _id: ch._id.toString(),
              novelId: ch.novelId.toString(),
              name: ch.name,
              chap: ch.chap,
              wordCount: ch.wordCount,
              createdAt: ch.createdAt,
              updatedAt: ch.updatedAt,
            })),
          })
        } catch (error) {
          console.error('Error fetching chapters:', error)
          return Response.json(
            { success: false, message: 'Failed to fetch chapters' },
            { status: 500 }
          )
        }
      },
    },
  },
})
