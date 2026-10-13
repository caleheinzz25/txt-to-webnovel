import { createFileRoute } from '@tanstack/solid-router'
import { getAllNovels } from '../../lib/models/novels'

export const Route = createFileRoute('/api/novels')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const search = url.searchParams.get('search') || undefined
          const sortBy = url.searchParams.get('sortBy') || 'createdAt'
          const sortOrder =
            (url.searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'

          const novels = await getAllNovels(search, sortBy, sortOrder)

          return Response.json({
            success: true,
            data: novels.map((n) => ({
              _id: n._id.toString(),
              name: n.name,
              totalChapters: n.totalChapters,
              totalWords: n.totalWords,
              createdAt: n.createdAt,
              updatedAt: n.updatedAt,
            })),
          })
        } catch (error) {
          console.error('Error fetching novels:', error)
          return Response.json(
            { success: false, message: 'Failed to fetch novels' },
            { status: 500 }
          )
        }
      },
    },
  },
})
