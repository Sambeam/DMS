import { NoteCanvasState } from "../models/models.js";

export const getNoteCanvasState = async (req, res) => {
  try {
    const { userId } = req.params;
    const existing = await NoteCanvasState.findOne({ user_id: userId });
    if (!existing) {
      return res.json({ data: null });
    }
    res.json({
      data: existing.data ?? null,
      updatedAt: existing.updatedAt,
    });
  } catch (error) {
    console.error("Failed to fetch note canvas state:", error);
    res.status(500).json({ error: "Unable to load notes." });
  }
};

export const saveNoteCanvasState = async (req, res) => {
  try {
    const { userId, data } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    const snapshot = data ?? {};
    const updated = await NoteCanvasState.findOneAndUpdate(
      { user_id: userId },
      { data: snapshot, user_id: userId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({
      success: true,
      data: updated.data,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error("Failed to save note canvas state:", error);
    res.status(500).json({ error: "Unable to save notes." });
  }
};
