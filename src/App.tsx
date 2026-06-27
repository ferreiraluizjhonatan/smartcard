import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import Auth from './pages/Auth';
import UpdatePassword from './pages/UpdatePassword';
import Dashboard from './pages/Dashboard';
import UsersList from './pages/Users/List';
import UsersForm from './pages/Users/Form';
import CompaniesList from './pages/Companies/List';
import CompaniesForm from './pages/Companies/Form';
import ElevatorsList from './pages/Elevators/List';
import ElevatorsChecklist from './pages/Elevators/Checklist';
import ElevatorHub from './pages/Elevators/Hub';
import ElevatorsSchedule from './pages/Elevators/Schedule';
import ElevatorReport from './pages/Elevators/Report';
import OperationalIntelligence from './pages/Intelligence/Dashboard';
import ClientPortal from './pages/Public/ClientPortal';
import TicketsList from './pages/Tickets/List';
import Forecasts from './pages/Forecasts';
import Tenants from './pages/Admin/Tenants';
import Layout from './components/Layout';
import { EmpresasContratadasList } from './pages/EmpresasContratadasList';
import { EmpresaDetail } from './pages/EmpresaDetail';
import MestrePortal from './pages/MestrePortal';
import MechanicPortal from './pages/MechanicPortal';
import ClientWeeklyReport from './pages/Public/ClientWeeklyReport';
import './App.css';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="app-container" style={{justifyContent: 'center', alignItems:'center'}}>Carregando...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!session ? <Auth /> : <Navigate to="/" />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="/tracking/:id" element={<ClientPortal />} />
        <Route path="/client-report/:id" element={<ClientWeeklyReport />} />
        <Route path="/mestre/:projectName" element={<MestrePortal />} />
        <Route path="/mecanico/:telegramId" element={<MechanicPortal />} />
        <Route path="/" element={session ? <Layout /> : <Navigate to="/login" />}>
          <Route index element={<Dashboard />} />
          <Route path="/forecasts" element={<Forecasts />} />
          <Route path="/tenants" element={<Tenants />} />
          <Route path="/users" element={<UsersList />} />
          <Route path="/users/new" element={<UsersForm />} />
          <Route path="/users/:id/edit" element={<UsersForm />} />
          <Route path="/companies" element={<CompaniesList />} />
          <Route path="/companies/new" element={<CompaniesForm />} />
          <Route path="/companies/:id/edit" element={<CompaniesForm />} />
          <Route path="/elevators" element={<ElevatorsList />} />
          <Route path="/elevators/:id/hub" element={<ElevatorHub />} />
          <Route path="/elevators/:id/checklist" element={<ElevatorsChecklist />} />
          <Route path="/elevators/:id/schedule" element={<ElevatorsSchedule />} />
          <Route path="/elevators/:id/report" element={<ElevatorReport />} />
          <Route path="/intelligence" element={<OperationalIntelligence />} />
          <Route path="/tickets" element={<TicketsList />} />
          <Route path="/empresas-contratadas" element={<EmpresasContratadasList />} />
          <Route path="/empresas-contratadas/:id" element={<EmpresaDetail />} />
          <Route path="*" element={<div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}><h2>404 - Página não encontrada</h2><p>Este módulo não existe ou ainda não foi implementado.</p></div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
