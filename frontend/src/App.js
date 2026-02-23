import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
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

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/contratos" element={<Contratos />} />
        <Route path="/parcelas" element={<Parcelas />} />
        <Route path="/fincas" element={<Fincas />} />
        <Route path="/visitas" element={<Visitas />} />
        <Route path="/tareas" element={<Tareas />} />
        <Route path="/tratamientos" element={<Tratamientos />} />
        <Route path="/irrigaciones" element={<Irrigaciones />} />
        <Route path="/recetas" element={<Recetas />} />
        <Route path="/albaranes" element={<Albaranes />} />
        <Route path="/cosechas" element={<Cosechas />} />
        <Route path="/documentos" element={<Documentos />} />
      </Routes>
    </Layout>
  );
}

export default App;