// src/utils/notes.ts

export function getValidNote(notesEs?: string | null, notesSv?: string | null): string | null {
    if (notesEs && !notesEs.toUpperCase().includes('QUERY LENGTH LIMIT') && !notesEs.toUpperCase().includes('MYMEMORY')) {
      return notesEs;
    }
    return notesSv || null;
  }