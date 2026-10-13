import { createFileRoute } from '@tanstack/solid-router'
import { ObjectId } from 'mongodb'
import { getNovelById, updateNovel } from '../../lib/models/novels'
import {
  getChaptersByNovelId,
  createManyChapters,
  deleteChaptersByNovelId,
} from '../../lib/models/chapters'
import {
  splitNovelIntoChapters,
  type HeadingPreset,
} from '../../lib/textProcessor'

export const Route = createFileRoute('/api/novels/$id/resplit')({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        try {
          const { id } = params
          const body = await request.json()

          const novel = await getNovelById(id)
          if (!novel) {
            return Response.json(
              { success: false, message: 'Novel not found' },
              { status: 404 }
            )
          }

          // Parse settings
          const wordsPerChapter = body.wordsPerChapter
            ? Math.max(100, Math.min(50000, parseInt(body.wordsPerChapter, 10)))
            : 2000
          const forceWordSplit =
            body.forceWordSplit !== undefined ? Boolean(body.forceWordSplit) : false
          const headingPreset: HeadingPreset = body.headingPreset || 'auto'
          const customPattern = body.customPattern || ''

          // Retrieve all existing chapters to reconstruct novel text
          const existingChapters = await getChaptersByNovelId(id, true)

          if (existingChapters.length === 0) {
            return Response.json(
              { success: false, message: 'No chapters found to re-split' },
              { status: 400 }
            )
          }

          // Reconstruct full text from existing chapters
          const fullText = existingChapters.map((ch) => ch.content).join('\n\n')

          // Re-split using the new word setting and heading preset
          const processedChapters = splitNovelIntoChapters(
            fullText,
            wordsPerChapter,
            forceWordSplit,
            headingPreset,
            customPattern
          )

          if (processedChapters.length === 0) {
            return Response.json(
              {
                success: false,
                message: 'Failed to split novel with the given settings',
              },
              { status: 400 }
            )
          }

          const totalWords = processedChapters.reduce(
            (sum, ch) => sum + ch.wordCount,
            0
          )

          // Delete existing chapters
          await deleteChaptersByNovelId(id)

          // Create new chapter documents
          const newChapters = processedChapters.map((ch, index) => ({
            novelId: novel._id as ObjectId,
            name: ch.title || `Chapter ${index + 1}`,
            chap: index + 1,
            content: ch.content,
            wordCount: ch.wordCount,
          }))

          await createManyChapters(newChapters)

          // Update novel document with new stats
          await updateNovel(id, {
            totalChapters: processedChapters.length,
            totalWords,
          })

          return Response.json({
            success: true,
            message: `Berhasil membagi ulang menjadi ${processedChapters.length} bab.`,
            data: {
              totalChapters: processedChapters.length,
              totalWords,
            },
          })
        } catch (error) {
          console.error('Error re-splitting novel:', error)
          return Response.json(
            { success: false, message: 'Failed to re-split novel' },
            { status: 500 }
          )
        }
      },
    },
  },
})
