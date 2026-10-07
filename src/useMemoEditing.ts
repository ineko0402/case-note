import { useReducer } from 'react';
import { updateNoteText, type Data, type Note } from './model.ts';

type State = { editing: string | null; text: string; drafts: Record<string, string> };
type Action = { type: 'begin'; note: Note } | { type: 'change'; text: string }
  | { type: 'close' | 'saved' | 'reset' };
export const initialMemoEdit: State = { editing: null, text: '', drafts: {} };

export function memoEditReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'begin':
      if (state.editing !== null) return state;
      return { ...state, editing: action.note.id,
        text: Object.hasOwn(state.drafts, action.note.id) ? state.drafts[action.note.id] : action.note.text };
    case 'change':
      return state.editing === null ? state : { ...state, text: action.text };
    case 'close':
      return state.editing === null ? state : {
        editing: null, text: '', drafts: { ...state.drafts, [state.editing]: state.text }
      };
    case 'saved': {
      if (state.editing === null) return state;
      const drafts = { ...state.drafts };
      delete drafts[state.editing];
      return { editing: null, text: '', drafts };
    }
    case 'reset':
      return initialMemoEdit;
  }
}

export function useMemoEditing(data: Data, update: (data: Data) => void) {
  const [state, dispatch] = useReducer(memoEditReducer, initialMemoEdit);
  return {
    editing: state.editing,
    text: state.text,
    begin: (note: Note) => dispatch({ type: 'begin', note }),
    change: (text: string) => dispatch({ type: 'change', text }),
    close: () => dispatch({ type: 'close' }),
    reset: () => dispatch({ type: 'reset' }),
    save() {
      if (state.editing === null || !state.text.trim() || !data.notes.some(note => note.id === state.editing)) return;
      update(updateNoteText(data, state.editing, state.text));
      dispatch({ type: 'saved' });
    }
  };
}

export type MemoEditing = ReturnType<typeof useMemoEditing>;
