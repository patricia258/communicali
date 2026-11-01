import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/funnel-display/400.css';
import '@fontsource/funnel-display/600.css';
import '@fontsource/funnel-display/700.css';
import './styles.css';
import './home.css';
import { ComEdicao } from './lib';
import { Home } from './pages/Home';
import { Checkin, Validar } from './pages/Checkin';
import { TextoPagina } from './pages/Cadastro';
import { MeuEspaco } from './pages/MeuEspaco';
import { CodigoConvite } from './pages/Edicao';
import { Votar } from './pages/Votar';
import { Convidar, Convite } from './pages/Convidados';
import { TelaoCheckin, TelaoVotacao } from './pages/Telao';
import { Admin } from './pages/Admin';
import { StaffForm } from './pages/Staff';
import { EdicaoPage, InscricaoPage } from './pages/Edicao';
import { ErrorBoundary, reportError } from './components/ErrorBoundary';
import { PublicFormPage } from './forms/PublicFormPage';
import { SiteFooter } from './components/SiteFooter';
import type { ReactNode } from 'react';

const Page = ({ children }: { children: ReactNode }) => <>{children}<SiteFooter /></>;

sessionStorage.removeItem('comuni-reload');
window.addEventListener('error', (event) => { if (event.message) reportError(event.message); });
window.addEventListener('unhandledrejection', (event) => reportError(String(event.reason?.message || event.reason).slice(0, 300)));

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary><BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/checkin" element={<ComEdicao><Page><Checkin /></Page></ComEdicao>} />
      <Route path="/validar/:codigo" element={<Page><Validar /></Page>} />
      <Route path="/cadastro" element={<Navigate to="/#fazer-parte" replace />} />
      <Route path="/meu-espaco" element={<MeuEspaco />} />
      <Route path="/c/:codigo" element={<CodigoConvite />} />
      <Route path="/regras" element={<Page><TextoPagina tipo="regras" /></Page>} />
      <Route path="/privacidade" element={<Page><TextoPagina tipo="privacidade" /></Page>} />
      <Route path="/staff" element={<StaffForm />} />
      <Route path="/e/:slug" element={<EdicaoPage />} />
      <Route path="/inscricao/:slug" element={<InscricaoPage />} />
      <Route path="/votar" element={<ComEdicao><Page><Votar /></Page></ComEdicao>} />
      <Route path="/convidar" element={<ComEdicao><Convidar /></ComEdicao>} />
      <Route path="/convite/:token" element={<Page><Convite /></Page>} />
      <Route path="/telao/checkin" element={<ComEdicao><TelaoCheckin /></ComEdicao>} />
      <Route path="/telao/votacao" element={<ComEdicao><TelaoVotacao /></ComEdicao>} />
      <Route path="/f/:slug" element={<PublicFormPage />} />
      <Route path="/admin/*" element={<Admin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter></ErrorBoundary>,
);
