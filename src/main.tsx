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
import { EuVou } from './pages/EuVou';
import { Convidar, Convite } from './pages/Convidados';
import { TelaoCheckin, TelaoResultado, TelaoVotacao } from './pages/Telao';
import { Participante } from './dinamica/Participante';
import { Sala } from './dinamica/Sala';
import { PreviaConvidado } from './dinamica/PreviaConvidado';
import { TelaoUnico } from './dinamica/TelaoUnico';
import { Apoio } from './dinamica/Apoio';
import { TelaoDinamica } from './dinamica/TelaoDinamica';
import { Admin } from './pages/Admin';
import { StaffForm } from './pages/Staff';
import { FornecedorForm } from './pages/Fornecedor';
import { EdicaoPage, InscricaoPage } from './pages/Edicao';
import { ErrorBoundary, reportError } from './components/ErrorBoundary';
import { PublicFormPage } from './forms/PublicFormPage';
import { FooterLinks, SiteFooter } from './components/SiteFooter';
import type { ReactNode } from 'react';

const Page = ({ children }: { children: ReactNode }) => <>{children}<SiteFooter /></>;
// Telas do dia do encontro (votar, check-in): rodapé de uma linha, para não roubar a tela do celular.
const PageEvento = ({ children }: { children: ReactNode }) => <>{children}<footer className="site-footer site-footer--mini"><FooterLinks legalOnly /></footer></>;

sessionStorage.removeItem('comuni-reload');
window.addEventListener('error', (event) => { if (event.message) reportError(event.message); });
window.addEventListener('unhandledrejection', (event) => reportError(String(event.reason?.message || event.reason).slice(0, 300)));

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary><BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/checkin" element={<ComEdicao><PageEvento><Checkin /></PageEvento></ComEdicao>} />
      <Route path="/validar/:codigo" element={<Page><Validar /></Page>} />
      <Route path="/cadastro" element={<Navigate to="/#fazer-parte" replace />} />
      <Route path="/meu-passaporte" element={<MeuEspaco />} />
      <Route path="/meu-espaco" element={<MeuEspaco />} />
      <Route path="/c/:codigo" element={<CodigoConvite />} />
      <Route path="/regras" element={<Page><TextoPagina tipo="regras" /></Page>} />
      <Route path="/privacidade" element={<Page><TextoPagina tipo="privacidade" /></Page>} />
      <Route path="/staff" element={<StaffForm />} />
      <Route path="/fornecedor" element={<FornecedorForm />} />
      <Route path="/e/:slug" element={<EdicaoPage />} />
      <Route path="/inscricao/:slug" element={<InscricaoPage />} />
      <Route path="/votar" element={<ComEdicao><Votar /></ComEdicao>} />
      <Route path="/eu-vou" element={<PageEvento><EuVou /></PageEvento>} />
      <Route path="/convidar" element={<ComEdicao><Convidar /></ComEdicao>} />
      <Route path="/convite/:token" element={<Page><Convite /></Page>} />
      <Route path="/telao/checkin" element={<ComEdicao><TelaoCheckin /></ComEdicao>} />
      <Route path="/telao/votacao" element={<ComEdicao><TelaoVotacao /></ComEdicao>} />
      <Route path="/telao/resultado" element={<ComEdicao><TelaoResultado /></ComEdicao>} />
      <Route path="/telao" element={<ComEdicao><TelaoUnico /></ComEdicao>} />
      <Route path="/previa-convidado" element={<PreviaConvidado />} />
      <Route path="/sala" element={<ComEdicao><Sala /></ComEdicao>} />
      <Route path="/apoio/:token" element={<Apoio />} />
      <Route path="/dinamica" element={<ComEdicao><Participante /></ComEdicao>} />
      <Route path="/telao/dinamica" element={<ComEdicao><TelaoDinamica /></ComEdicao>} />
      <Route path="/f/:slug" element={<PublicFormPage />} />
      <Route path="/admin/*" element={<Admin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter></ErrorBoundary>,
);
