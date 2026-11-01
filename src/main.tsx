import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import './styles.css';
import { Home } from './pages/Home';
import { Checkin, Validar } from './pages/Checkin';
import { Cadastro, TextoPagina } from './pages/Cadastro';
import { Votar } from './pages/Votar';
import { Convidar, Convite } from './pages/Convidados';
import { TelaoCheckin, TelaoVotacao } from './pages/Telao';
import { Admin } from './pages/Admin';
import { PublicFormPage } from './forms/PublicFormPage';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/checkin" element={<Checkin />} />
      <Route path="/validar/:codigo" element={<Validar />} />
      <Route path="/cadastro" element={<Cadastro />} />
      <Route path="/regras" element={<TextoPagina tipo="regras" />} />
      <Route path="/privacidade" element={<TextoPagina tipo="privacidade" />} />
      <Route path="/votar" element={<Votar />} />
      <Route path="/convidar" element={<Convidar />} />
      <Route path="/convite/:token" element={<Convite />} />
      <Route path="/telao/checkin" element={<TelaoCheckin />} />
      <Route path="/telao/votacao" element={<TelaoVotacao />} />
      <Route path="/f/:slug" element={<PublicFormPage />} />
      <Route path="/admin/*" element={<Admin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>,
);
