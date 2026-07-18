'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function AttendancePage() {
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState<string | null>(null);
  const [alreadyMarked, setAlreadyMarked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sessionExpired, setSessionExpired] = useState<string | null>(null);
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear previous debounce and state
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    if (!studentId.trim()) {
      setStudentName(null);
      setMessage(null);
      return;
    }

    setMessage(null);
    setStudentName(null);

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/student/verify/${encodeURIComponent(studentId.trim())}`);
        const data = await res.json();

        if (res.ok) {
          setStudentName(data.name);
          setAlreadyMarked(data.alreadyMarked);
          setMessage(null);
        } else {
          setStudentName(null);
          setAlreadyMarked(false);
          setMessage({ type: 'error', text: data.error || 'Student ID not found.' });
        }
      } catch (error) {
        setStudentName(null);
        setMessage({ type: 'error', text: 'Unable to connect to server. Please try again.' });
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [studentId]);

  const handleSubmit = async () => {
    if (!studentId || !studentName) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: studentId.trim() })
      });
      
      const data = await res.json();

      if (res.ok) {
        setSessionExpired(data.message);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to mark attendance.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Unable to connect to server. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (sessionExpired) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Image & Gradients */}
        <img src="/bg2.png" alt="Library Background" className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none" />
        
        <div className="bg-slate-900/60 border border-slate-800 backdrop-blur-xl rounded-3xl shadow-2xl shadow-emerald-500/10 w-full max-w-md p-8 text-center space-y-5 z-10 animate-in fade-in zoom-in duration-300">
          <div className="mx-auto w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Thank You!</h1>
          <p className="text-slate-300 text-lg font-medium">{sessionExpired}</p>
          <div className="mt-8 pt-6 border-t border-slate-800">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Session Complete</p>
            <p className="text-xs text-slate-600 mt-2">You may safely close this tab.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Image & Gradients */}
      <img src="/bg2.png" alt="Library Background" className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none" />
      
      <div className="bg-slate-900/60 border border-slate-800 backdrop-blur-xl rounded-3xl shadow-2xl shadow-emerald-500/10 w-full max-w-md p-6 sm:p-8 space-y-6 z-10 animate-in fade-in zoom-in duration-300">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold uppercase tracking-wider mb-4">
             Mark Your Attendance Here!
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-linear-to-r from-white via-slate-100 to-emerald-400 bg-clip-text text-transparent">Chhaya Library</h1>
          <p className="text-sm text-slate-400 mt-1.5">Scan your ID to check-in for today!</p>
        </div>

        <div className="space-y-4 pt-2">
          <div>
            <label htmlFor="studentId" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Student ID
            </label>
            <div className="relative">
              <input
                id="studentId"
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                disabled={isLoading}
                placeholder="Enter ID"
                className="w-full px-4 py-4 rounded-xl bg-slate-950/50 border border-slate-800 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/60 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed uppercase text-white font-extrabold text-2xl tracking-widest text-center shadow-inner placeholder:text-slate-600 placeholder:font-medium placeholder:tracking-normal placeholder:text-base"
              />
              {isLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                </div>
              )}
            </div>
          </div>

          <div className="min-h-[50px]">
            {studentName ? (
              <div className={`flex flex-col gap-1 p-3.5 rounded-xl border ${alreadyMarked ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'}`}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span className="font-bold text-sm">Welcome, {studentName}</span>
                </div>
                {alreadyMarked && (
                  <span className="text-xs font-semibold ml-7 opacity-90">Your attendance is already marked for today.</span>
                )}
              </div>
            ) : message?.type === 'error' ? (
              <div className="flex items-center gap-2 text-rose-300 bg-rose-500/10 p-3.5 rounded-xl border border-rose-500/20">
                <XCircle className="w-5 h-5 shrink-0" />
                <span className="font-bold text-sm">{message.text}</span>
              </div>
            ) : message?.type === 'success' ? (
              <div className="flex items-center gap-2 text-indigo-300 bg-indigo-500/10 p-3.5 rounded-xl border border-indigo-500/20">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span className="font-bold text-sm">{message.text}</span>
              </div>
            ) : null}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!studentName || isLoading || alreadyMarked}
            className={`w-full font-bold py-3.5 px-4 rounded-xl transition-all shadow-md active:transform active:scale-[0.98] flex items-center justify-center gap-2 ${
              alreadyMarked 
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed shadow-none'
                : 'bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20 border border-emerald-400/20 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {alreadyMarked ? 'Already Submitted' : 'Submit Attendance'}
          </button>
        </div>
        
        <div className="mt-6 pt-6 border-t border-slate-800/80 text-center text-xs font-medium text-slate-500">
          <p>Please ensure you are connected to the network.</p>
        </div>
      </div>
    </div>
  );
}
