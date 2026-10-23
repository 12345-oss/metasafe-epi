import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { Carregando } from "./components/ui";
import { AuthProvider, RealtimeProvider, ToastProvider, useAuth } from "./lib/contexts";
import AlertaDetalhePage from "./pages/AlertaDetalhe";
import AlertasPage from "./pages/Alertas";
import HistoricoPage from "./pages/Historico";
import LoginPage from "./pages/Login";
import MonitoramentoPage from "./pages/Monitoramento";
import OperadorDetalhePage from "./pages/OperadorDetalhe";
import OperadorFormPage from "./pages/OperadorForm";
import OperadoresPage from "./pages/Operadores";
import RelatoriosPage from "./pages/Relatorios";
import SobrePage from "./pages/Sobre";
import TerminalPage from "./pages/Terminal";
import VisaoGeralPage from "./pages/VisaoGeral";
import ZonaFormPage from "./pages/ZonaForm";
import ZonasPage from "./pages/Zonas";
import "./styles/prototipo.css";
import "./styles/app.css";

function Rotas() {
  const { usuario, carregando } = useAuth();
  if (carregando) return <Carregando texto="Abrindo o MetaSafe…" />;
  if (!usuario) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }
  const operador = usuario.perfil === "operador";
  return (
    <Routes>
      <Route element={<Layout />}>
        {operador ? (
          <>
            <Route path="/terminal" element={<TerminalPage />} />
            <Route path="/sobre" element={<SobrePage />} />
            <Route path="*" element={<Navigate to="/terminal" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<VisaoGeralPage />} />
            <Route path="/monitoramento" element={<MonitoramentoPage />} />
            <Route path="/operadores" element={<OperadoresPage />} />
            <Route path="/operadores/novo" element={<OperadorFormPage />} />
            <Route path="/operadores/:id" element={<OperadorDetalhePage />} />
            <Route path="/operadores/:id/editar" element={<OperadorFormPage />} />
            <Route path="/alertas" element={<AlertasPage />} />
            <Route path="/alertas/:id" element={<AlertaDetalhePage />} />
            <Route path="/historico" element={<HistoricoPage />} />
            <Route path="/zonas" element={<ZonasPage />} />
            <Route path="/zonas/nova" element={<ZonaFormPage />} />
            <Route path="/zonas/:id" element={<ZonaFormPage />} />
            <Route path="/relatorios" element={<RelatoriosPage />} />
            <Route path="/terminal" element={<TerminalPage />} />
            <Route path="/sobre" element={<SobrePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Route>
    </Routes>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <RealtimeProvider>
            <Rotas />
          </RealtimeProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
