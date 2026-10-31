import { createRoot } from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './styles.css';
import { Home } from './pages/Home';
import { Checkin } from './pages/Checkin';
import { Votar } from './pages/Votar';
import { TelaoCheckin, TelaoVotacao } from './pages/Telao';

function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/checkin') return <Checkin />;
  if (path === '/votar') return <Votar />;
  if (path === '/telao/checkin') return <TelaoCheckin />;
  if (path === '/telao/votacao') return <TelaoVotacao />;
  return <Home />;
}

createRoot(document.getElementById('root')!).render(<App />);
