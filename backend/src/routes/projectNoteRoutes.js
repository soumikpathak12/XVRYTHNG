import { Router } from 'express';
import db from '../config/db.js';

const router = Router({ mergeParams: true });

router.get('/', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const [rows] = await db.execute(
      `SELECT id, project_id, body, created_by, created_at 
       FROM project_notes 
       WHERE project_id = ? 
       ORDER BY created_at DESC`,
      [projectId]
    );

    // Format to match frontend activity log structure expectations if needed
    const formattedNotes = rows.map(n => ({
      id: `note-${n.id}`, // keep unique for frontend map keys
      db_id: n.id,
      type: 'note',
      body: n.body,
      created_by: n.created_by,
      created_at: n.created_at,
    }));

    res.json({ success: true, data: formattedNotes });
  } catch (err) {
    console.error('[PROJECT NOTES GET] Error:', err);
    res.status(500).json({ success: false, message: 'Failed to find project notes' });
  }
});

router.post('/', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const { body } = req.body;
    const userId = req.user?.id || null; // Requires auth middleware

    if (!body || !body.trim()) {
      return res.status(400).json({ success: false, message: 'Note body is required' });
    }

    const [result] = await db.execute(
      `INSERT INTO project_notes (project_id, body, created_by, created_at)
       VALUES (?, ?, ?, NOW())`,
      [projectId, body.trim(), userId]
    );

    const newNoteId = result.insertId;

    const [newNote] = await db.execute(
      `SELECT id, project_id, body, created_by, created_at 
       FROM project_notes WHERE id = ? LIMIT 1`,
      [newNoteId]
    );

    res.status(201).json({ 
      success: true, 
      data: {
        id: `note-${newNote[0].id}`,
        db_id: newNote[0].id,
        type: 'note',
        body: newNote[0].body,
        created_by: newNote[0].created_by,
        created_at: newNote[0].created_at,
      } 
    });
  } catch (err) {
    console.error('[PROJECT NOTES POST] Error:', err);
    res.status(500).json({ success: false, message: 'Failed to create project note' });
  }
});

export default router;
