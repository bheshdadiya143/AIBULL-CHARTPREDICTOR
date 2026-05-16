import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const originalOnError = window.onerror;
window.onerror = function (msg, url, lineNo, columnNo, error) {
  if (msg === 'Script error.' || (typeof msg === 'string' && msg.includes('Script error'))) {
    return true;
  }
  if (originalOnError) {
    return originalOnError(msg, url, lineNo, columnNo, error);
  }
  return false;
};

window.addEventListener('error', (e) => {
  if (e.message === 'Script error.') {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
