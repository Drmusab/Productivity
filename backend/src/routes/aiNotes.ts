/**
 * @fileoverview AI Notes Routes (Phase G)
 * 
 * API endpoints for AI-powered note intelligence features:
 * - POST /api/ai-notes/summarize - Summarize a note
 * - POST /api/ai-notes/generate-tasks - Generate tasks from a note
 * - POST /api/ai-notes/suggest-links - Suggest links for a note
 * - POST /api/ai-notes/vault-qa - Answer questions from vault
 * - POST /api/ai-notes/approve-task - Approve and create a generated task
 * 
 * All endpoints follow the approval workflow pattern - AI outputs
 * are suggestions that require user confirmation.
 */

import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { noteService } from '../services/noteService';
import { noteAIService } from '../services/ai/noteAIService';
import { graphService } from '../services/graphService';
import { runAsync } from '../utils/database';
import { recordTaskHistory } from '../utils/history';
import { emitEvent } from '../services/eventBus';
import { TaskNoteRelationType } from '../types/notes';
import { CandidateNote } from '../types/ai';

const router = express.Router();

/**
 * @swagger
 * /api/ai-notes/summarize:
 *   post:
 *     summary: Generate AI summary of a note
 *     tags: [AI Notes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - noteId
 *             properties:
 *               noteId:
 *                 type: string
 *                 description: Note ID to summarize
 *     responses:
 *       200:
 *         description: Summary generated successfully
 *       404:
 *         description: Note not found
 *       500:
 *         description: AI processing error
 */
router.post(
  '/summarize',
  [body('noteId').notEmpty().withMessage('Note ID is required')],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { noteId } = req.body;

    try {
      // Get the note
      const note = await noteService.getNote(noteId);
      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }

      // Generate summary
      const result = await noteAIService.summarizeNote({
        noteId,
        contentMarkdown: note.contentMarkdown,
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('AI summarize error:', error);
      return res.status(500).json({
        error: 'Failed to generate summary',
        details: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-notes/generate-tasks:
 *   post:
 *     summary: Generate tasks from note content
 *     tags: [AI Notes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - noteId
 *             properties:
 *               noteId:
 *                 type: string
 *                 description: Note ID to extract tasks from
 *     responses:
 *       200:
 *         description: Tasks generated (pending approval)
 *       404:
 *         description: Note not found
 *       500:
 *         description: AI processing error
 */
router.post(
  '/generate-tasks',
  [body('noteId').notEmpty().withMessage('Note ID is required')],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { noteId } = req.body;

    try {
      // Get the note
      const note = await noteService.getNote(noteId);
      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }

      // Generate tasks
      const result = await noteAIService.generateTasksFromNote({
        noteId,
        contentMarkdown: note.contentMarkdown,
      });

      return res.json({
        success: true,
        data: result,
        message: result.tasks.length > 0
          ? `Generated ${result.tasks.length} task(s) for approval`
          : 'No actionable tasks found in this note',
      });
    } catch (error: any) {
      console.error('AI generate tasks error:', error);
      return res.status(500).json({
        error: 'Failed to generate tasks',
        details: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-notes/approve-task:
 *   post:
 *     summary: Approve and create a generated task
 *     tags: [AI Notes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - sourceNoteId
 *               - columnId
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               sourceNoteId:
 *                 type: string
 *               columnId:
 *                 type: integer
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *     responses:
 *       200:
 *         description: Task created successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Database error
 */
router.post(
  '/approve-task',
  [
    body('title').notEmpty().withMessage('Task title is required'),
    body('sourceNoteId').notEmpty().withMessage('Source note ID is required'),
    body('columnId').isInt({ min: 1 }).withMessage('Valid column ID is required'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, sourceNoteId, columnId, priority = 'medium' } = req.body;

    try {
      // Verify the source note exists
      const note = await noteService.getNote(sourceNoteId);
      if (!note) {
        return res.status(404).json({ error: 'Source note not found' });
      }

      // Get next position in column
      const posResult = await new Promise<any>((resolve, reject) => {
        const db = require('../utils/database');
        db.getAsync('SELECT MAX(position) as maxPosition FROM tasks WHERE column_id = ?', [columnId])
          .then(resolve)
          .catch(reject);
      });
      const position = ((posResult && posResult.maxPosition) || 0) + 1;

      // Create the task
      const insertResult = await runAsync(
        `INSERT INTO tasks (title, description, column_id, position, priority)
         VALUES (?, ?, ?, ?, ?)`,
        [title, description || '', columnId, position, priority]
      );

      const taskId = insertResult.lastID;

      // Record history
      recordTaskHistory(taskId, 'created', null, null, null);
      emitEvent('task', 'created', { taskId, columnId });

      // Create task-note relation with 'derived' type for AI-generated tasks
      await noteService.createTaskNoteRelation({
        taskId,
        noteId: sourceNoteId,
        relationType: TaskNoteRelationType.DERIVED,
      });

      return res.json({
        success: true,
        taskId,
        message: `Task "${title}" created and linked to note`,
      });
    } catch (error: any) {
      console.error('Approve task error:', error);
      return res.status(500).json({
        error: 'Failed to create task',
        details: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-notes/suggest-links:
 *   post:
 *     summary: Suggest links to other notes
 *     tags: [AI Notes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - noteId
 *             properties:
 *               noteId:
 *                 type: string
 *                 description: Note ID to suggest links for
 *               maxSuggestions:
 *                 type: integer
 *                 default: 5
 *                 description: Maximum number of suggestions
 *     responses:
 *       200:
 *         description: Link suggestions generated
 *       404:
 *         description: Note not found
 *       500:
 *         description: AI processing error
 */
router.post(
  '/suggest-links',
  [body('noteId').notEmpty().withMessage('Note ID is required')],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { noteId, maxSuggestions = 5 } = req.body;

    try {
      // Get the note
      const note = await noteService.getNote(noteId);
      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }

      // Get existing outgoing links
      const outgoingLinks = await noteService.getOutgoingLinks(noteId);
      const existingLinkIds = outgoingLinks
        .filter(link => link.targetNoteId)
        .map(link => link.targetNoteId as string);

      // Get candidate notes (all notes except current and already linked)
      const allNotes = await noteService.listNotes({ limit: 50 });
      const candidateNotes: CandidateNote[] = allNotes
        .filter(n => n.id !== noteId && !existingLinkIds.includes(n.id))
        .slice(0, 20)
        .map(n => ({
          id: n.id,
          title: n.title,
          contentPreview: n.contentMarkdown.substring(0, 200),
        }));

      if (candidateNotes.length === 0) {
        return res.json({
          success: true,
          data: {
            noteId,
            suggestions: [],
            generatedAt: new Date().toISOString(),
          },
          message: 'No candidate notes available for linking',
        });
      }

      // Generate suggestions
      const result = await noteAIService.suggestLinks({
        noteId,
        contentMarkdown: note.contentMarkdown,
        existingLinks: existingLinkIds,
        candidateNotes,
      });

      // Limit suggestions
      result.suggestions = result.suggestions.slice(0, maxSuggestions);

      return res.json({
        success: true,
        data: result,
        message: result.suggestions.length > 0
          ? `Found ${result.suggestions.length} potential link(s)`
          : 'No link suggestions found',
      });
    } catch (error: any) {
      console.error('AI suggest links error:', error);
      return res.status(500).json({
        error: 'Failed to generate link suggestions',
        details: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-notes/vault-qa:
 *   post:
 *     summary: Answer a question using vault content (RAG)
 *     tags: [AI Notes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *             properties:
 *               question:
 *                 type: string
 *                 description: Question to answer from vault
 *               maxNotes:
 *                 type: integer
 *                 default: 5
 *                 description: Maximum notes to use for context
 *     responses:
 *       200:
 *         description: Answer generated with sources
 *       400:
 *         description: Invalid input
 *       500:
 *         description: AI processing error
 */
router.post(
  '/vault-qa',
  [body('question').notEmpty().withMessage('Question is required')],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { question, maxNotes = 5 } = req.body;

    try {
      // Generate answer from vault
      const result = await noteAIService.answerFromVault({
        question,
        maxNotes,
      });

      return res.json({
        success: true,
        data: result,
        message: result.foundInVault
          ? 'Answer found in your notes'
          : 'No relevant information found in your notes',
      });
    } catch (error: any) {
      console.error('AI vault QA error:', error);
      return res.status(500).json({
        error: 'Failed to answer question',
        details: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-notes/capabilities:
 *   get:
 *     summary: Get AI capabilities and status
 *     tags: [AI Notes]
 *     responses:
 *       200:
 *         description: AI capabilities information
 */
router.get('/capabilities', async (_req: Request, res: Response) => {
  try {
    // Import to check provider status
    const { getDefaultAIProvider, PROMPT_VERSIONS } = await import('../services/ai');
    const provider = getDefaultAIProvider();

    return res.json({
      success: true,
      capabilities: {
        summarizeNote: {
          description: 'Generate concise summaries from notes',
          trigger: 'Manual: "Summarize note" button',
          available: true,
        },
        generateTasks: {
          description: 'Extract actionable tasks from notes',
          trigger: 'Manual: "Generate tasks" button',
          available: true,
          requiresApproval: true,
        },
        suggestLinks: {
          description: 'Suggest links to related notes',
          trigger: 'Manual: "Suggest links" button',
          available: true,
        },
        vaultQA: {
          description: 'Answer questions using your notes (RAG)',
          trigger: 'Ask a question about your vault',
          available: true,
        },
      },
      provider: {
        type: provider.isAvailable() ? 'http' : 'mock',
        available: provider.isAvailable(),
        note: provider.isAvailable()
          ? 'Using configured AI provider'
          : 'Using mock provider (set AI_API_KEY for real AI)',
      },
      promptVersions: PROMPT_VERSIONS,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to get capabilities',
      details: error.message,
    });
  }
});

export default router;
