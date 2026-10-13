import { useReducer, useState } from 'react';
import { updateNoteText, applyKeywordClassification, type KeywordClassification, type Data, type Note } from './model.ts';
import { usedClassifications } from './numericCandidates.ts';

type Draft = { text:string; title:string; classifications:KeywordClassification[] };
type State = Draft & { editing:string|null; drafts:Record<string,Draft> };
type Action = { type: 'begin'; note: Note } | { type: 'change'; text: string; classification?: KeywordClassification } | {type:'title'; title:string}
  | { type: 'close' | 'saved' | 'reset' };
const blankDraft:Draft={text:'',title:'',classifications:[]};
export const initialMemoEdit: State = { ...blankDraft, editing: null, drafts: {} };

export function memoEditReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'begin':
      if (state.editing !== null) return state;
      return { ...state, editing: action.note.id,
        ...(Object.hasOwn(state.drafts,action.note.id) ? state.drafts[action.note.id] : {text:action.note.text,title:action.note.title ?? '',classifications:[]}) };
    case 'change':
      return state.editing === null ? state : { ...state, text: action.text, classifications: action.classification ? [...(state.classifications ?? []).filter(item => item.word !== action.classification!.word),action.classification] : state.classifications };
    case 'title':
      return state.editing === null ? state : {...state,title:action.title};
    case 'close':
      return state.editing === null ? state : {
        ...blankDraft, editing: null, drafts: { ...state.drafts, [state.editing]: {text:state.text,title:state.title,classifications:state.classifications} }
      };
    case 'saved': {
      if (state.editing === null) return state;
      const drafts = { ...state.drafts };
      delete drafts[state.editing];
      return { ...blankDraft, editing: null, drafts };
    }
    case 'reset':
      return initialMemoEdit;
  }
}

export function useMemoEditing(data: Data, update: (data: Data) => void) {
  const [state, dispatch] = useReducer(memoEditReducer, initialMemoEdit);
  const [error,setError]=useState('');
  return {
    error,
    editing: state.editing,
    text: state.text,
    title: state.title ?? '',
    changeTitle: (title:string) => {setError('');dispatch({type:'title',title});},
    begin: (note: Note) => {setError('');dispatch({ type: 'begin', note });},
    change: (text: string, classification?: KeywordClassification) => {
      applyKeywordClassification(data,classification);
      setError('');
      dispatch({ type: 'change', text, classification });
    },
    close: () => {setError('');dispatch({ type: 'close' });},
    reset: () => {setError('');dispatch({ type: 'reset' });},
    save() {
      if (state.editing === null || !state.text.trim() || !data.notes.some(note => note.id === state.editing)) return;
      try {
        const next = usedClassifications(state.text,state.classifications).reduce((next,item)=>applyKeywordClassification(next,item),data);
        update(updateNoteText(next, state.editing, state.text, state.title));
        setError('');dispatch({ type: 'saved' });
      } catch(cause) {setError((cause as Error).message);}
    }
  };
}

export type MemoEditing = ReturnType<typeof useMemoEditing>;
