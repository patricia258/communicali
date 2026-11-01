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
import { Home } from './pages/Home';
import { Checkin, Validar } from './pages/Checkin';
import { Cadastro, TextoPagina } from './pages/Cadastro';
import { Votar } from './pages/Votar';
import { Convidar, Convite } from './pages/Convidados';
import { TelaoCheckin, TelaoVotacao } from './pages/Telao';
import { Admin } from './pages/Admin';
import { StaffForm } from './pages/Staff';
import { PublicFormPage } from './forms/PublicFormPage';
import { SiteFooter } from './components/SiteFooter';
import type { ReactNode } from 'react';

const Page = ({ children }: { children: ReactNode }) => <>{children}<SiteFooter /></>;

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/checkin" element={<Page><Checkin /></Page>} />
      <Route path="/validar/:codigo" element={<Page><Validar /></Page>} />
      <Route path="/cadastro" element={<Page><Cadastro /></Page>} />
      <Route path="/regras" element={<Page><TextoPagina tipo="regras" /></Page>} />
      <Route path="/privacidade" element={<Page><TextoPagina tipo="privacidade" /></Page>} />
      <Route path="/staff" element={<StaffForm />} />
      <Route path="/votar" element={<Page><Votar /></Page>} />
      <Route path="/convidar" element={<Convidar />} />
      <Route path="/convite/:token" element={<Page><Convite /></Page>} />
      <Route path="/telao/checkin" element={<TelaoCheckin />} />
      <Route path="/telao/votacao" element={<TelaoVotacao />} />
      <Route path="/f/:slug" element={<PublicFormPage />} />
      <Route path="/admin/*" element={<Admin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>,
);
