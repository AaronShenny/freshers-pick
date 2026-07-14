import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layouts/Layout';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import History from './pages/History';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { useEffect, useState } from 'react';
import { supabase } from './services/supabase';
import FlickerSpinner from './components/FlickerSpinner';

// This must match Vite's `base` config. React Router uses this so all
// routes are resolved relative to the sub-path on GitHub Pages.
const BASE = import.meta.env.BASE_URL; // e.g. "/picker/" in production, "/" locally

function App() {
  const [session, setSession] = useState<any>(null);
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
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-[#0d0d0d] animate-fade-up">
        <FlickerSpinner size={40} />
      </div>
    );
  }

  return (
    // `basename` tells React Router the sub-path the app is mounted at.
    // This ensures <Link to="/students"> renders as /picker/students on GitHub Pages.
    <BrowserRouter basename={BASE}>
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" replace />} />

        {session ? (
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/students" element={<Students />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
