import { createRoot } from 'react-dom/client';
import { App } from './App';
import './style.css';
import './WorkflowLayout.css';
import './ConnectionActions.css';
import './MobileOrganize.css';
import './pwa';

createRoot(document.getElementById('root')!).render(<App/>);
