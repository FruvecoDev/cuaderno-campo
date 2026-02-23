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
      </Routes>
    </AuthProvider>
  );
}

export default App;