import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, Shield, CheckCircle2, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DevAdminPage() {
  const { devLogin } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Initializing Development Admin Session...');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const initSession = async () => {
    setLoading(true);
    setError(null);
    setStatus('Connecting and activating Test Administrator profile...');

    try {
      await devLogin('admin');
      setStatus('Development Admin session active! Redirecting to Admin Dashboard...');
      setTimeout(() => {
        navigate('/admin/dashboard', { replace: true });
      }, 400);
    } catch (err) {
      console.error('Dev admin initialization failed:', err);
      setError(err.response?.data?.message || err.message || 'Failed to initialize development admin session.');
      setLoading(false);
    }
  };

  useEffect(() => {
    initSession();
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-2xs space-y-4 animate-in fade-in">
        <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 mx-auto flex items-center justify-center">
          {error ? <AlertCircle className="w-6 h-6 text-rose-600" /> : <Shield className="w-6 h-6" />}
        </div>
        
        <h2 className="text-xl font-bold text-slate-900">Dev Mode: Admin Access</h2>
        
        {error ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 text-left">
              <strong>Connection Error:</strong> {error}
              <p className="mt-1 text-[11px] text-rose-600">
                Please ensure the backend server is running at <code className="bg-rose-100 px-1 py-0.5 rounded">http://localhost:5000</code>.
              </p>
            </div>
            <button
              onClick={initSession}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Connection</span>
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-600 flex items-center justify-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
            <span>{status}</span>
          </p>
        )}
      </div>
    </div>
  );
}
