import { createFileRoute } from '@tanstack/solid-router'
import { getNovelById, deleteNovel } from '../../lib/models/novels'
import {
  getChaptersByNovelId,
  deleteChaptersByNovelId,
} from '../../lib/models/chapters'

export const Route = createFileRoute('/api/novels/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { id } = params
          const novel = await getNovelById(id)

          if (!novel) {
            return Response.json(
              { success: false, message: 'Novel not found' },
              { status: 404 }
            )
          }

          // Get chapters list (without full content for performance)
          const chapters = await getChaptersByNovelId(id, false)
          const chapterList = chapters.map((ch) => ({
            _id: ch._id.toString(),
            name: ch.name,
            chap: ch.chap,
            wordCount: ch.wordCount,
          }))

          return Response.json({
            success: true,
            data: {
              _id: novel._id.toString(),
              name: novel.name,
              totalChapters: novel.totalChapters,
              totalWords: novel.totalWords,
              createdAt: novel.createdAt,
              updatedAt: novel.updatedAt,
              chapters: chapterList,
            },
          })
        } catch (error) {
          console.error('Error fetching novel:', error)
          return Response.json(
            { success: false, message: 'Failed to fetch novel' },
            { status: 500 }
          )
        }
      },

      DELETE: async ({ params }) => {
        try {
          const { id } = params
          const novel = await getNovelById(id)

          if (!novel) {
            return Response.json(
              { success: false, message: 'Novel not found' },
              { status: 404 }
            )
          }

          // Delete all chapters first
          await deleteChaptersByNovelId(id)

          // Delete the novel
          await deleteNovel(id)

          return Response.json({
            success: true,
            message: 'Novel and all chapters deleted successfully',
          })
        } catch (error) {
          console.error('Error deleting novel:', error)
          return Response.json(
            { success: false, message: 'Failed to delete novel' },
            { status: 500 }
          )
        }
      },
    },
  },
})
