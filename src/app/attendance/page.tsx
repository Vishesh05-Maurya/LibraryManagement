'use client';

import { useState, useEffect, useRef } from 'react';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center space-y-5 animate-in fade-in zoom-in duration-300">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Thank You!</h1>
          <p className="text-gray-600 text-lg font-medium">{sessionExpired}</p>
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Session Complete</p>
            <p className="text-xs text-gray-500 mt-2">You may safely close this tab.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Library Attendance</h1>
          <p className="text-sm text-gray-500 mt-1">Scan your ID to check-in or check-out</p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-full px-4 py-4 rounded-xl border-2 border-gray-300 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-600 transition-all outline-none disabled:bg-gray-100 disabled:cursor-not-allowed uppercase text-gray-900 font-extrabold text-2xl tracking-widest text-center shadow-inner placeholder:text-gray-400 placeholder:font-medium placeholder:tracking-normal placeholder:text-base"
              />
              {isLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                </div>
              )}
            </div>
          </div>

          <div className="min-h-[40px]">
            {studentName ? (
              <div className={`flex flex-col gap-1 p-3 rounded-lg border ${alreadyMarked ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span className="font-medium">Welcome, {studentName}</span>
                </div>
                {alreadyMarked && (
                  <span className="text-sm font-semibold ml-7">Your attendance is already marked for today.</span>
                )}
              </div>
            ) : message?.type === 'error' ? (
              <div className="flex items-center gap-2 text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">
                <XCircle className="w-5 h-5 shrink-0" />
                <span className="font-medium">{message.text}</span>
              </div>
            ) : message?.type === 'success' ? (
              <div className="flex items-center gap-2 text-blue-700 bg-blue-50 p-3 rounded-lg border border-blue-200">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span className="font-medium">{message.text}</span>
              </div>
            ) : null}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!studentName || isLoading || alreadyMarked}
            className={`w-full font-semibold py-3 px-4 rounded-xl transition-all shadow-md active:transform active:scale-[0.98] ${
              alreadyMarked 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {alreadyMarked ? 'Already Submitted' : 'Submit Attendance'}
          </button>
        </div>
        
        <div className="mt-8 text-center text-xs text-gray-400">
          <p>Please ensure you are connected to the library network.</p>
        </div>
      </div>
    </div>
  );
}
