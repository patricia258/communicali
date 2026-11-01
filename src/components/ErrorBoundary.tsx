import { Component, type ErrorInfo, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export const reportError = (message: string) => {
  void supabase.rpc('communicali_registrar_erro', { p_pagina: window.location.pathname, p_mensagem: message, p_navegador: navigator.userAgent });
};

/** Se uma tela falhar, a pessoa vê uma saída em vez de uma página vazia, e o erro fica registrado para correção. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(`${error.message} ${info.componentStack?.slice(0, 200) || ''}`);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="event-page">
        <section className="event-card">
          <h1>Não foi possível abrir esta tela</h1>
          <p className="event-card__meta">Recarregue a página. Se continuar, fale com a CALI pelo WhatsApp +55 41 8787-9244.</p>
          <button className="button" type="button" onClick={() => window.location.reload()}>Recarregar</button>
        </section>
      </main>
    );
  }
}
