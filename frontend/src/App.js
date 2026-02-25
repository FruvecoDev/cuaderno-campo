import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Contratos from './pages/Contratos';
import Parcelas from './pages/Parcelas';
import Fincas from './pages/Fincas';
import Visitas from './pages/Visitas';
import Tareas from './pages/Tareas';
import Tratamientos from './pages/Tratamientos';
import Irrigaciones from './pages/Irrigaciones';
import Recetas from './pages/Recetas';
import Albaranes from './pages/Albaranes';
import Cosechas from './pages/Cosechas';
import Documentos from './pages/Documentos';
import Usuarios from './pages/Usuarios';
import Proveedores from './pages/Proveedores';
import Cultivos from './pages/Cultivos';
import Maquinaria from './pages/Maquinaria';
import Evaluaciones from './pages/Evaluaciones';
import Fitosanitarios from './pages/Fitosanitarios';
import InformesGastos from './pages/InformesGastos';
import InformesIngresos from './pages/InformesIngresos';
import Traducciones from './pages/Traducciones';
import AsistenteIA from './pages/AsistenteIA';
import TecnicosAplicadores from './pages/TecnicosAplicadores';
import ArticulosExplotacion from './pages/ArticulosExplotacion';
import Agentes from './pages/Agentes';
import Clientes from './pages/Clientes';
import LiquidacionComisiones from './pages/LiquidacionComisiones';
import Configuracion from './pages/Configuracion';
import Recomendaciones from './pages/Recomendaciones';
import AlertasClima from './pages/AlertasClima';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <Navigate to="/dashboard" replace />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout><Dashboard /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/asistente-ia" element={
          <ProtectedRoute>
            <Layout><AsistenteIA /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/contratos" element={
          <ProtectedRoute>
            <Layout><Contratos /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/parcelas" element={
          <ProtectedRoute>
            <Layout><Parcelas /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/fincas" element={
          <ProtectedRoute>
            <Layout><Fincas /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/visitas" element={
          <ProtectedRoute>
            <Layout><Visitas /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/recomendaciones" element={
          <ProtectedRoute>
            <Layout><Recomendaciones /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/tareas" element={
          <ProtectedRoute>
            <Layout><Tareas /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/tratamientos" element={
          <ProtectedRoute>
            <Layout><Tratamientos /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/irrigaciones" element={
          <ProtectedRoute>
            <Layout><Irrigaciones /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/recetas" element={
          <ProtectedRoute>
            <Layout><Recetas /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/albaranes" element={
          <ProtectedRoute>
            <Layout><Albaranes /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/cosechas" element={
          <ProtectedRoute>
            <Layout><Cosechas /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/documentos" element={
          <ProtectedRoute>
            <Layout><Documentos /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/usuarios" element={
          <ProtectedRoute>
            <Layout><Usuarios /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/proveedores" element={
          <ProtectedRoute>
            <Layout><Proveedores /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/cultivos" element={
          <ProtectedRoute>
            <Layout><Cultivos /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/maquinaria" element={
          <ProtectedRoute>
            <Layout><Maquinaria /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/tecnicos-aplicadores" element={
          <ProtectedRoute>
            <Layout><TecnicosAplicadores /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/articulos-explotacion" element={
          <ProtectedRoute>
            <Layout><ArticulosExplotacion /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/agentes" element={
          <ProtectedRoute>
            <Layout><Agentes /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/clientes" element={
          <ProtectedRoute>
            <Layout><Clientes /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/liquidacion-comisiones" element={
          <ProtectedRoute>
            <Layout><LiquidacionComisiones /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/evaluaciones" element={
          <ProtectedRoute>
            <Layout><Evaluaciones /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/fitosanitarios" element={
          <ProtectedRoute>
            <Layout><Fitosanitarios /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/informes-gastos" element={
          <ProtectedRoute>
            <Layout><InformesGastos /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/informes-ingresos" element={
          <ProtectedRoute>
            <Layout><InformesIngresos /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/traducciones" element={
          <ProtectedRoute>
            <Layout><Traducciones /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/configuracion" element={
          <ProtectedRoute>
            <Layout><Configuracion /></Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/alertas-clima" element={
          <ProtectedRoute>
            <Layout><AlertasClima /></Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  );
}

export default App;