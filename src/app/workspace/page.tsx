import Dashboard from '../../components/Dashboard';
import { getDashboardData } from '../../actions/crmActions';

export const dynamic = 'force-dynamic';

export default async function WorkspacePage() {
  // Retrieve dashboard datasets from MongoDB
  const res = await getDashboardData();
  
  if (!res.success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-center text-slate-100">
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-full mb-4">
          <svg className="h-12 w-12 text-rose-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Database Connection Error</h1>
        <p className="text-slate-400 mt-2 max-w-md text-sm leading-relaxed">
          {res.error || 'Failed to authenticate database and pull configuration parameters.'}
        </p>
        <div className="mt-6 text-xs text-slate-600 bg-slate-900 border border-slate-800 px-4 py-3 rounded-lg max-w-sm">
          Please check your <code className="text-rose-400">MONGODB_URI</code> configuration in your local <code className="text-rose-400">.env.local</code> file and ensure the database server is running.
        </div>
      </div>
    );
  }

  // Render main CRM Layout
  return (
    <Dashboard 
      initialSeats={res.seats || []}
      initialDueOrOverdue={res.dueOrOverdueStudents || []}
      initialMetrics={res.metrics!}
      adminEmail="Chhaya Admin"
    />
  );
}
