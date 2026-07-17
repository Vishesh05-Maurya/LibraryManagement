'use client';

import React, { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import * as Dialog from '@radix-ui/react-dialog';
import { 
  Users, 
  DollarSign, 
  CheckCircle, 
  AlertCircle, 
  Calendar, 
  Phone, 
  UserPlus, 
  Home, 
  Check, 
  Loader2, 
  Wrench, 
  ArrowLeftRight, 
  Search, 
  Copy, 
  TrendingUp, 
  Info,
  X,
  LayoutGrid,
  MessageCircle,
  QrCode
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
// Mongoose Server Actions are bypassed in favor of unified REST calls

interface StudentData {
  _id: string;
  studentId?: string;
  name: string;
  contactNumber: string;
  seatNumber: number;
  joinDate: string;
  renewalDate: string;
  paymentStatus: 'Paid' | 'Pending';
  paymentMethod: 'Cash' | 'UPI' | 'Bank Transfer';
  shift: 'Day' | 'Night' | 'Day & Night';
  price: number;
  isActive: boolean;
}

interface SeatData {
  _id: string;
  seatNumber: number;
  status: 'Available' | 'Occupied' | 'Maintenance';
  currentStudentId: StudentData | null;
}

interface Metrics {
  totalActive: number;
  totalOccupied: number;
  totalAvailable: number;
  totalMaintenance: number;
  monthlyRevenue: number;
}

interface DashboardProps {
  initialSeats?: SeatData[];
  initialDueOrOverdue?: StudentData[];
  initialMetrics?: Metrics;
  adminEmail?: string;
  initialTab?: 'map' | 'allotted' | 'allot';
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export default function Dashboard({ 
  initialSeats = [], 
  initialDueOrOverdue = [], 
  initialMetrics = { totalActive: 0, totalOccupied: 0, totalAvailable: 0, totalMaintenance: 0, monthlyRevenue: 0 },
  adminEmail = 'Chhaya Admin',
  initialTab = 'map'
}: DashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [seats, setSeats] = useState<SeatData[]>(initialSeats);
  const [dueOrOverdue, setDueOrOverdue] = useState<StudentData[]>(initialDueOrOverdue);
  const [metrics, setMetrics] = useState<Metrics>(initialMetrics);
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
    refreshData();
  }, []);

  // Search filter for student name/phone
  const [searchQuery, setSearchQuery] = useState('');

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modal control states
  const [allotModalOpen, setAllotModalOpen] = useState(false);
  const [allotSeatNum, setAllotSeatNum] = useState<number | null>(null);

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<SeatData | null>(null);
  const [studentAttendance, setStudentAttendance] = useState<{ date: Date; present: boolean; inRange: boolean; isFuture: boolean }[] | null>(null);

  const [changeSeatModalOpen, setChangeSeatModalOpen] = useState(false);
  const [targetSeatNum, setTargetSeatNum] = useState<string>('');

  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({
    name: '',
    contactNumber: '',
    shift: 'Day',
    price: 500
  });

  const [confirmVacate, setConfirmVacate] = useState(false);
  const [copied, setCopied] = useState(false);
  const [initialPaymentCollected, setInitialPaymentCollected] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<'map' | 'allotted' | 'allot'>(initialTab);

  const handleTabChange = (tab: 'map' | 'allotted' | 'allot', searchStr?: string) => {
    setWorkspaceTab(tab);
    const newUrl = tab === 'map' 
      ? '/workspace' 
      : `/workspace/${tab}${searchStr || ''}`;
    window.history.pushState({ tab }, '', newUrl);
  };

  React.useEffect(() => {
    setWorkspaceTab(initialTab);
    if (mounted) {
      const params = new URLSearchParams(window.location.search);
      const seatParam = params.get('seat');
      if (seatParam) {
        setAllotSeatNum(parseInt(seatParam));
      }
    }
  }, [initialTab, mounted]);

  React.useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const path = window.location.pathname;
      if (path.endsWith('/allotted')) {
        setWorkspaceTab('allotted');
      } else if (path.endsWith('/allot')) {
        setWorkspaceTab('allot');
        const params = new URLSearchParams(window.location.search);
        const seatParam = params.get('seat');
        if (seatParam) {
          setAllotSeatNum(parseInt(seatParam));
        }
      } else {
        setWorkspaceTab('map');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  React.useEffect(() => {
    if (detailsModalOpen && selectedSeat?.currentStudentId) {
      setStudentAttendance(null); // loading state
      fetch(`${API_BASE}/api/student/${selectedSeat.currentStudentId._id}/attendance`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.joinDate) {
            const joinDate = new Date(data.joinDate);
            joinDate.setHours(0,0,0,0);
            const today = new Date();
            today.setHours(0,0,0,0);
            
            let start = new Date(today);
            start.setDate(today.getDate() - 29); // Up to last 30 days
            if (joinDate > start) start = joinDate;

            // Pad start to Sunday
            const calendarStart = new Date(start);
            calendarStart.setDate(calendarStart.getDate() - calendarStart.getDay());
            
            // Pad end to Saturday
            const calendarEnd = new Date(today);
            if (calendarEnd.getDay() !== 6) {
              calendarEnd.setDate(calendarEnd.getDate() + (6 - calendarEnd.getDay()));
            }

            const grid = [];
            const presentDates = new Set(
              (data.attendance || []).map((r: any) => new Date(r.date).toDateString())
            );

            for (let d = new Date(calendarStart); d <= calendarEnd; d.setDate(d.getDate() + 1)) {
              grid.push({
                date: new Date(d),
                present: presentDates.has(d.toDateString()),
                inRange: d >= start && d <= today,
                isFuture: d > today
              });
            }
            setStudentAttendance(grid);
          }
        })
        .catch(err => console.error("Error fetching attendance:", err));
    }
  }, [detailsModalOpen, selectedSeat]);


  // Form states for Alloting Seat
  const [allotForm, setAllotForm] = useState({
    name: '',
    contactNumber: '',
    joinDate: new Date().toISOString().split('T')[0],
    paymentStatus: 'Paid' as 'Paid' | 'Pending',
    paymentMethod: 'UPI' as 'Cash' | 'UPI' | 'Bank Transfer',
    shift: 'Day' as 'Day' | 'Night' | 'Day & Night',
    price: 500
  });

  // Show customized toasts
  const triggerToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Helper: Refresh dashboard data client-side after actions
  const refreshData = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/crm`);
      const res = await response.json();
      if (res.success && res.seats) {
        setSeats(res.seats);
        setDueOrOverdue(res.dueOrOverdueStudents || []);
        setMetrics(res.metrics || initialMetrics);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  // Helper: calculate days remaining until renewal
  const getDaysRemaining = (renewalDateStr: string) => {
    const renewalDate = new Date(renewalDateStr);
    const today = new Date();
    renewalDate.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    
    const diffTime = renewalDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Memoized lists for seats and filter matching
  const filteredSeats = useMemo(() => {
    if (!searchQuery.trim()) return seats;
    const q = searchQuery.toLowerCase().trim();
    return seats.map(seat => {
      // If seat has student and name/phone match query
      if (seat.currentStudentId) {
        const student = seat.currentStudentId;
        const matches = student.name.toLowerCase().includes(q) || 
                        student.contactNumber.includes(q) ||
                        seat.seatNumber.toString() === q;
        return {
          ...seat,
          // Highlight seat match status: we will keep rendering it but can styling-flag it
          isHighlighted: matches
        };
      }
      return {
        ...seat,
        isHighlighted: seat.seatNumber.toString() === q
      };
    });
  }, [seats, searchQuery]);

  // Available seats list for the Change Seat dropdown
  const availableSeatNumbers = useMemo(() => {
    return seats
      .filter(s => s.status === 'Available')
      .map(s => s.seatNumber)
      .sort((a, b) => a - b);
  }, [seats]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-xs text-slate-400 mt-3 font-medium">Synchronizing CRM Workspace...</p>
      </div>
    );
  }

  // Action handlers
  const handleAllotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allotSeatNum) return;
    if (!allotForm.name.trim() || !allotForm.contactNumber.trim()) {
      triggerToast('Please fill all required fields', 'error');
      return;
    }
    if (!/^\d{10}$/.test(allotForm.contactNumber)) {
      triggerToast('Mobile number must be exactly 10 digits and contain only numbers.', 'error');
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(`${API_BASE}/api/crm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'allot',
            data: {
              name: allotForm.name,
              contactNumber: allotForm.contactNumber,
              seatNumber: allotSeatNum,
              joinDate: allotForm.joinDate,
              paymentStatus: allotForm.paymentStatus,
              paymentMethod: allotForm.paymentMethod,
              shift: allotForm.shift,
              price: Number(allotForm.price)
            }
          })
        });
        const res = await response.json();

        if (res.success) {
          const toastMsg = res.generatedStudentId 
            ? `Seat ${allotSeatNum} successfully allotted to ${allotForm.name}! ID: ${res.generatedStudentId}`
            : `Seat ${allotSeatNum} successfully allotted to ${allotForm.name}!`;
          triggerToast(toastMsg, 'success');
          setAllotModalOpen(false);
          setInitialPaymentCollected(false);
          handleTabChange('allotted');
          setAllotSeatNum(null);
          setAllotForm({
            name: '',
            contactNumber: '',
            joinDate: new Date().toISOString().split('T')[0],
            paymentStatus: 'Paid',
            paymentMethod: 'UPI',
            shift: 'Day',
            price: 500
          });
          await refreshData();
        } else {
          triggerToast(res.error || 'Failed to allot seat', 'error');
        }
      } catch (err: any) {
        triggerToast(err.message || 'Network error', 'error');
      }
    });
  };

  const handleRenew = async (studentId: string, studentName: string) => {
    startTransition(async () => {
      try {
        const response = await fetch(`${API_BASE}/api/crm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'renew',
            data: { studentId }
          })
        });
        const res = await response.json();
        if (res.success) {
          triggerToast(`Extended subscription for ${studentName} by 30 days.`, 'success');
          await refreshData();
          // If details modal is open for this student, update selected seat view
          if (selectedSeat?.currentStudentId?._id === studentId) {
            setTimeout(async () => {
              const fetchRes = await fetch(`${API_BASE}/api/crm`);
              const r = await fetchRes.json();
              if (r.success) {
                const refreshedSeat = r.seats?.find((s: any) => s._id === selectedSeat._id);
                if (refreshedSeat) setSelectedSeat(refreshedSeat);
              }
            }, 200);
          }
        } else {
          triggerToast(res.error || 'Failed to renew subscription', 'error');
        }
      } catch (err: any) {
        triggerToast(err.message || 'Network error', 'error');
      }
    });
  };

  const handleVacate = async () => {
    if (!selectedSeat || !selectedSeat.currentStudentId) return;
    const { seatNumber, currentStudentId } = selectedSeat;
    
    startTransition(async () => {
      try {
        const response = await fetch(`${API_BASE}/api/crm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'vacate',
            data: { seatNumber, studentId: currentStudentId._id }
          })
        });
        const res = await response.json();
        if (res.success) {
          triggerToast(`Seat ${seatNumber} is now vacant. Record archived.`, 'success');
          setConfirmVacate(false);
          setDetailsModalOpen(false);
          setSelectedSeat(null);
          await refreshData();
        } else {
          triggerToast(res.error || 'Failed to vacate seat', 'error');
        }
      } catch (err: any) {
        triggerToast(err.message || 'Network error', 'error');
      }
    });
  };

  const handleChangeSeatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeat || !selectedSeat.currentStudentId || !targetSeatNum) return;
    const student = selectedSeat.currentStudentId;
    const oldSeat = selectedSeat.seatNumber;
    const newSeat = parseInt(targetSeatNum);

    startTransition(async () => {
      try {
        const response = await fetch(`${API_BASE}/api/crm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'change',
            data: { studentId: student._id, oldSeatNumber: oldSeat, newSeatNumber: newSeat }
          })
        });
        const res = await response.json();
        if (res.success) {
          triggerToast(`Moved ${student.name} from Seat ${oldSeat} to Seat ${newSeat}`, 'success');
          setChangeSeatModalOpen(false);
          setDetailsModalOpen(false);
          setSelectedSeat(null);
          setTargetSeatNum('');
          await refreshData();
        } else {
          triggerToast(res.error || 'Failed to transfer seat', 'error');
        }
      } catch (err: any) {
        triggerToast(err.message || 'Network error', 'error');
      }
    });
  };

  const handleEditProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeat || !selectedSeat.currentStudentId) return;
    const student = selectedSeat.currentStudentId;

    startTransition(async () => {
      try {
        const response = await fetch(`${API_BASE}/api/crm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'updateProfile',
            data: { 
              studentId: student._id, 
              name: editProfileForm.name,
              contactNumber: editProfileForm.contactNumber,
              shift: editProfileForm.shift,
              price: Number(editProfileForm.price)
            }
          })
        });

        const res = await response.json();
        if (response.ok && res.success) {
          triggerToast('Profile updated successfully!', 'success');
          setEditProfileModalOpen(false);
          await refreshData();
          setSelectedSeat(prev => {
            if (!prev || !prev.currentStudentId) return prev;
            return {
              ...prev,
              currentStudentId: {
                ...prev.currentStudentId,
                name: editProfileForm.name,
                contactNumber: editProfileForm.contactNumber,
                shift: editProfileForm.shift as any,
                price: Number(editProfileForm.price)
              }
            };
          });
        } else {
          triggerToast(res.error || 'Failed to update profile', 'error');
        }
      } catch (err: any) {
        triggerToast(err.message || 'Network error', 'error');
      }
    });
  };

  const handleToggleMaintenance = async (seatNum: number, currentStatus: 'Available' | 'Maintenance') => {
    startTransition(async () => {
      try {
        const response = await fetch(`${API_BASE}/api/crm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'toggleMaintenance',
            data: { seatNumber: seatNum, currentStatus }
          })
        });
        const res = await response.json();
        if (res.success) {
          const next = res.nextStatus === 'Maintenance' ? 'placed under maintenance' : 'restored to available';
          triggerToast(`Seat ${seatNum} has been ${next}.`, 'success');
          setDetailsModalOpen(false);
          setSelectedSeat(null);
          await refreshData();
        } else {
          triggerToast(res.error || 'Failed to change maintenance status', 'error');
        }
      } catch (err: any) {
        triggerToast(err.message || 'Network error', 'error');
      }
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    triggerToast('Contact number copied to clipboard!', 'success');
  };

  const handleCellClick = (seat: SeatData) => {
    if (seat.status === 'Available') {
      setAllotSeatNum(seat.seatNumber);
      setInitialPaymentCollected(false);
      handleTabChange('allot', `?seat=${seat.seatNumber}`);
    } else {
      setSelectedSeat(seat);
      setDetailsModalOpen(true);
    }
  };

  const handleAlertCardClick = (student: StudentData) => {
    const seat = seats.find(s => s.seatNumber === student.seatNumber);
    if (seat) {
      setSelectedSeat(seat);
      setDetailsModalOpen(true);
    } else {
      const tempSeat: SeatData = {
        _id: '',
        seatNumber: student.seatNumber,
        status: 'Occupied',
        currentStudentId: student
      };
      setSelectedSeat(tempSeat);
      setDetailsModalOpen(true);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 font-sans text-slate-100 overflow-x-hidden min-h-screen">
      {/* Toast Notification Container */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-5 py-4 rounded-xl border shadow-2xl animate-in slide-in-from-bottom-5 duration-300 backdrop-blur-md ${
          toast.type === 'success' 
            ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300' 
            : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="h-5 w-5 text-emerald-400" /> : <AlertCircle className="h-5 w-5 text-rose-400" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header bar */}
      <header className="sticky top-0 z-30 border-b border-emerald-500/25 bg-emerald-950/35 backdrop-blur-lg px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-linear-to-tr from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-linear-to-r from-white via-slate-100 to-emerald-400 bg-clip-text text-transparent">
              Chhaya Library Managemant 
            </h1>
            <p className="text-sm text-emerald-400/80 font-semibold">Seat & Payment Manager</p>
          </div>
        </div>

        {/* Navigation tabs in header */}
        <div className="hidden md:flex items-center gap-2 border border-slate-800 bg-slate-950/40 p-1 rounded-xl">
          <a
            href="/workspace"
            onClick={(e) => {
              e.preventDefault();
              handleTabChange('map');
            }}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${
              workspaceTab === 'map'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-450 text-emerald-400'
                : 'bg-transparent border border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Seat Map
          </a>
          <a
            href="/workspace/allotted"
            onClick={(e) => {
              e.preventDefault();
              handleTabChange('allotted');
            }}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${
              workspaceTab === 'allotted'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold'
                : 'bg-transparent border border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Allotted Students
          </a>
          <a
            href="/workspace/allot"
            onClick={(e) => {
              e.preventDefault();
              handleTabChange('allot');
            }}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${
              workspaceTab === 'allot'
                ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-bold'
                : 'bg-transparent border border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Allot New Student
          </a>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-sm font-semibold text-slate-300">{adminEmail}</span>
            <span className="text-xs text-emerald-400 font-bold flex items-center justify-end gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              Owner Admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => window.open('/attendance', '_blank')}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 text-sm font-semibold rounded-lg transition duration-200 cursor-pointer"
            >
              <QrCode className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden md:inline">Attendance</span>
            </button>
            <button 
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 text-sm font-semibold rounded-lg transition duration-200 cursor-pointer"
            >
              <Home className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden md:inline">Home</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content split dashboard */}
      <main className="flex-1 w-full max-w-none px-4 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Workspace View (Left column - span 7) */}
        <section className="lg:col-span-7 flex flex-col space-y-5">
          {/* Tab content rendering */}
          {workspaceTab === 'allotted' ? (
            /* 1. LIST OF TOTAL ALLOTTED STUDENTS CARD */
            <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-4 lg:p-6 flex flex-col space-y-4 h-[650px] animate-in fade-in duration-200">
              
              {/* Header and Search */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users className="h-4.5 w-4.5 text-emerald-400" />
                    Allotted Students
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full text-sm font-semibold">
                      {seats.filter(s => s.status === 'Occupied').length} Active
                    </span>
                  </h2>
                </div>
                
                {/* Search query input for students */}
                <div className="relative w-full">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Search name, phone or seat..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-900/60 border border-slate-800 rounded-xl text-sm placeholder:text-slate-500 text-white focus:outline-none focus:border-emerald-500/60 transition-all"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable list of green cards */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                {(() => {
                  const occupiedSeats = seats.filter(seat => seat.status === 'Occupied' && seat.currentStudentId);
                  const filteredAllotted = occupiedSeats.filter(seat => {
                    const student = seat.currentStudentId!;
                    const query = searchQuery.toLowerCase().trim();
                    if (!query) return true;
                    return (
                      student.name.toLowerCase().includes(query) ||
                      student.contactNumber.includes(query) ||
                      seat.seatNumber.toString().includes(query)
                    );
                  });

                  if (filteredAllotted.length === 0) {
                    return (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                        <Users className="h-8 w-8 text-slate-700 mb-2" />
                        <p className="text-xs">No active students found.</p>
                      </div>
                    );
                  }

                  return filteredAllotted.map(seat => {
                    const student = seat.currentStudentId!;
                    const days = getDaysRemaining(student.renewalDate);
                    const isPendingRenewal = days <= 0;

                    return (
                      <div
                        key={seat._id}
                        onClick={() => {
                          setSelectedSeat(seat);
                          setDetailsModalOpen(true);
                        }}
                        className="p-3 bg-emerald-950/5 hover:bg-emerald-950/15 border border-emerald-500/10 hover:border-emerald-500/35 rounded-xl transition-all cursor-pointer flex flex-col gap-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-xs font-bold">
                            Seat #{seat.seatNumber}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                            isPendingRenewal
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          }`}>
                            {isPendingRenewal ? 'Pending Renewal' : 'Paid'}
                          </span>
                        </div>

                        <div>
                          <h3 className="font-bold text-base text-slate-200">{student.name}</h3>
                          <p className="text-sm text-slate-400 mt-0.5">
                            {student.studentId && <span className="font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-xs mr-2">{student.studentId}</span>}
                            {student.contactNumber} • {student.shift || 'Day'}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm text-slate-400 border-t border-slate-900/60 pt-2">
                          <div>
                            <span className="block text-[10px] uppercase text-slate-500 font-semibold">Join Date</span>
                            <span>{new Date(student.joinDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase text-slate-500 font-semibold">Renewal Date</span>
                            <span className={isPendingRenewal ? 'text-rose-400 font-semibold' : ''}>
                              {new Date(student.renewalDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          ) : workspaceTab === 'allot' ? (
            /* 2. ALLOT A NEW STUDENT CARD */
            <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-4 lg:p-6 flex flex-col space-y-4 animate-in fade-in duration-200">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserPlus className="h-4.5 w-4.5 text-indigo-400" />
                  Allot New Student
                </h2>
                <p className="text-sm text-slate-400 mt-0.5">Register a student and assign an available seat.</p>
              </div>

              <form onSubmit={handleAllotSubmit} className="space-y-4 text-sm">
                
                {/* Choose Seat Dropdown */}
                <div className="space-y-1">
                  <label className="block text-slate-400 font-semibold uppercase tracking-wider text-xs">Select Seat *</label>
                  <select
                    value={allotSeatNum || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAllotSeatNum(val ? parseInt(val) : null);
                    }}
                    required
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                  >
                    <option value="">-- Choose a Seat --</option>
                    {seats.map((seat) => {
                      const isAvailable = seat.status === 'Available';
                      return (
                        <option
                          key={seat.seatNumber}
                          value={seat.seatNumber}
                          disabled={!isAvailable}
                          className={
                            isAvailable 
                              ? 'bg-emerald-900 text-emerald-100 font-semibold text-sm' 
                              : seat.status === 'Maintenance'
                                ? 'bg-amber-950 text-amber-500/50 text-sm'
                                : 'bg-rose-950 text-rose-500/50 text-sm'
                          }
                        >
                          Seat #{seat.seatNumber} - {
                            isAvailable 
                              ? 'Available' 
                              : seat.status === 'Maintenance'
                                ? 'Maintenance'
                                : `Occupied by ${seat.currentStudentId?.name || 'Student'}`
                          }
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-450 font-semibold uppercase tracking-wider text-xs">Student Full Name *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={allotForm.name}
                    onChange={(e) => setAllotForm({ ...allotForm, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl p-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-450 font-semibold uppercase tracking-wider text-xs">Phone / Contact Number *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. 9876543210"
                    maxLength={10}
                    pattern="\d{10}"
                    value={allotForm.contactNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 10) {
                        setAllotForm({ ...allotForm, contactNumber: val });
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl p-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-450 font-semibold uppercase tracking-wider text-xs">Join Date</label>
                  <input 
                    type="date"
                    value={allotForm.joinDate}
                    onChange={(e) => setAllotForm({ ...allotForm, joinDate: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl p-2.5 text-sm text-white focus:outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-slate-450 font-semibold uppercase tracking-wider text-xs">Select Shift</label>
                    <select
                      value={allotForm.shift}
                      onChange={(e) => setAllotForm({ ...allotForm, shift: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl p-2.5 text-sm text-white focus:outline-none transition cursor-pointer"
                    >
                      <option value="Day">Day</option>
                      <option value="Night">Night</option>
                      <option value="Day & Night">Day & Night</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-450 font-semibold uppercase tracking-wider text-xs">Fee (₹) *</label>
                    <input 
                      type="number"
                      required
                      value={allotForm.price}
                      onChange={(e) => setAllotForm({ ...allotForm, price: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl p-2.5 text-sm text-white focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="bg-slate-800/40 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="block text-sm font-semibold text-slate-300">Admission Payment Required</span>
                    <span className="text-xs text-slate-500">Calculated Rate: ₹{allotForm.price} / mo</span>
                  </div>
                  <div>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      Paid
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-1 pt-1">
                  <input 
                    type="checkbox"
                    id="initialPaymentCheckbox"
                    checked={initialPaymentCollected}
                    onChange={(e) => setInitialPaymentCollected(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="initialPaymentCheckbox" className="text-sm text-slate-400 font-medium cursor-pointer select-none leading-normal">
                    I confirm that the initial payment of <span className="text-white font-bold">₹{allotForm.price}</span> has been received.
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isPending || !initialPaymentCollected || !allotSeatNum}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-900/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Confirm Allocation {allotSeatNum ? `(Seat #${allotSeatNum})` : ''}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* 3. WORKSPACE SEAT MAP (Original 150-seat grid) */
            <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-4 lg:p-6 flex flex-col space-y-6 animate-in fade-in duration-200">
              {/* Quick Metrics at the top of the Seat Map */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Occupancy Card */}
                <div className="relative overflow-hidden bg-slate-900/40 border border-slate-800 p-5 rounded-xl flex flex-col justify-between h-36 group hover:border-indigo-500/20 transition-all duration-300">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Users className="h-20 w-20 text-indigo-400" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-400">Occupancy Rate</span>
                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-xs font-bold">
                      {Math.round((metrics.totalOccupied / 150) * 100)}%
                    </span>
                  </div>
                  <div className="mt-2">
                    <h3 className="text-3xl font-extrabold text-white tracking-tight">{metrics.totalOccupied} / 150</h3>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${(metrics.totalOccupied / 150) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Seat Availability Status Card */}
                <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-xl space-y-3 flex flex-col justify-center">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Seat Availability Status</h4>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="bg-slate-900/60 border border-slate-800/80 p-2.5 rounded-lg text-center">
                      <span className="block text-[11px] text-slate-500 uppercase font-bold">Available</span>
                      <span className="text-xl font-bold text-emerald-400">{metrics.totalAvailable}</span>
                    </div>
                    <div className="bg-slate-900/60 border border-slate-800/80 p-2.5 rounded-lg text-center">
                      <span className="block text-[11px] text-slate-500 uppercase font-bold">Occupied</span>
                      <span className="text-xl font-bold text-rose-400">{metrics.totalOccupied}</span>
                    </div>
                    <div className="bg-slate-900/60 border border-slate-800/80 p-2.5 rounded-lg text-center">
                      <span className="block text-[11px] text-slate-500 uppercase font-bold">Service</span>
                      <span className="text-xl font-bold text-amber-400">{metrics.totalMaintenance}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Grid Header & Search Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-900 pt-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    Workspace Seat Map
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full text-sm font-semibold">
                      150 Seats Total
                    </span>
                  </h2>
                  <p className="text-sm text-slate-400">Click a seat to manage allocation, billing, and maintenance.</p>
                </div>

                {/* Elegant search input */}
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Search student or seat..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-900/60 border border-slate-800 rounded-xl text-sm placeholder:text-slate-500 text-white focus:outline-none focus:border-indigo-500/60 transition-all"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Color Indicator Legend */}
              <div className="flex flex-wrap items-center gap-5 text-sm text-slate-400 border-b border-slate-900 pb-4">
                <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Legend:</span>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-md bg-emerald-500/10 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]" />
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-md bg-rose-500/10 border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.1)]" />
                  <span>Occupied</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-md bg-amber-500/10 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]" />
                  <span>Maintenance</span>
                </div>
                {searchQuery && (
                  <div className="ml-auto text-xs text-indigo-400 font-semibold animate-pulse">
                    Filtered matches are highlighted
                  </div>
                )}
              </div>

              {/* The 150-Seat Grid */}
              <div className="flex-1 flex justify-center items-center">
                <div className="grid grid-cols-5 md:grid-cols-10 xl:grid-cols-15 gap-2.5 w-full">
                  {filteredSeats.map((seat) => {
                    const isOccupied = seat.status === 'Occupied';
                    const isMaintenance = seat.status === 'Maintenance';
                    const isAvailable = seat.status === 'Available';
                    
                    // For highlights during search query matching
                    const hasSearchFilter = searchQuery.trim().length > 0;
                    const matchesFilter = (seat as any).isHighlighted;
                    
                    // Compute tooltip details if occupied
                    let tooltipContent = null;
                    if (isOccupied && seat.currentStudentId) {
                      const student = seat.currentStudentId;
                      const days = getDaysRemaining(student.renewalDate);
                      const isOverdue = days < 0;
                      tooltipContent = {
                        name: student.name,
                        phone: student.contactNumber,
                        daysText: isOverdue 
                          ? `Overdue by ${Math.abs(days)} days` 
                          : days === 0 
                            ? 'Due Today!' 
                            : `${days} days remaining`,
                        isOverdue,
                        paymentStatus: student.paymentStatus
                      };
                    }

                    return (
                      <div 
                        key={seat._id}
                        onClick={() => handleCellClick(seat)}
                        className={`group relative aspect-square flex flex-col items-center justify-center rounded-xl border font-bold text-base transition-all duration-200 cursor-pointer select-none ${
                          isAvailable
                            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25 hover:border-emerald-500/50 hover:shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                            : isOccupied
                              ? 'bg-rose-500/5 border-rose-500/20 text-rose-400 hover:bg-rose-500/25 hover:border-rose-500/50 hover:shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                              : 'bg-amber-500/5 border-amber-500/20 text-amber-400 hover:bg-amber-500/25 hover:border-amber-500/50 hover:shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                        } ${
                          hasSearchFilter 
                            ? matchesFilter 
                              ? 'ring-2 ring-indigo-500 scale-102 border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.4)]'
                              : 'opacity-25'
                            : ''
                        }`}
                      >
                        <span>{seat.seatNumber}</span>

                        {/* Miniature dot status indicators */}
                        <span className={`absolute bottom-1.5 h-1.5 w-1.5 rounded-full ${
                          isAvailable ? 'bg-emerald-400' : isOccupied ? 'bg-rose-400' : 'bg-amber-400'
                        }`} />

                        {/* Smooth Tooltip for Occupied Seats */}
                        {isOccupied && tooltipContent && (
                          <div className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-3 w-52 -translate-x-1/2 scale-95 opacity-0 transition-all duration-200 origin-bottom group-hover:scale-100 group-hover:opacity-100 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.5)]">
                            <div className="relative rounded-xl border border-slate-800 bg-slate-900 p-3 text-left backdrop-blur-md">
                              {/* Tooltip triangle tail */}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1.5 border-4 border-transparent border-t-slate-900" />
                              <p className="font-bold text-sm text-white leading-tight truncate">{tooltipContent.name}</p>
                              <p className="text-xs text-slate-400 mt-0.5 leading-none flex items-center gap-1">
                                <Phone className="h-2.5 w-2.5 text-slate-500" />
                                {tooltipContent.phone}
                              </p>
                              
                              <div className="border-t border-slate-800/80 my-2 pt-1.5 flex items-center justify-between">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  tooltipContent.isOverdue 
                                    ? 'bg-rose-500/15 text-rose-400' 
                                    : 'bg-emerald-500/15 text-emerald-400'
                                }`}>
                                  {tooltipContent.daysText}
                                </span>
                                <span className={`text-[10px] font-semibold ${
                                  tooltipContent.paymentStatus === 'Pending' ? 'text-rose-400' : 'text-emerald-400'
                                }`}>
                                  {tooltipContent.paymentStatus}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="text-sm text-slate-500 flex items-center gap-1.5 pt-2 border-t border-slate-900">
            <Info className="h-3.5 w-3.5 text-slate-500" />
            <span>Click any student card to view invoice history, renew payment, reallocate to a different seat, or vacate.</span>
          </div>
        </section>

        {/* Sidebar Controls and Metrics (Right column - span 5) */}
        <section className="lg:col-span-5 space-y-6 flex flex-col h-fit">
          
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 gap-4">
            
            {/* Revenue Card */}
            <div className="relative overflow-hidden bg-slate-900/40 border border-slate-900 p-5 rounded-xl flex flex-col justify-between h-40 group hover:border-emerald-500/20 transition-all duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <DollarSign className="h-20 w-20 text-emerald-400" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-400">Monthly Collection</span>
                <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-emerald-400" />
                  This Month
                </span>
              </div>
              <div>
                <h3 className="text-3xl font-extrabold text-emerald-450 tracking-tight">
                  ₹{metrics.monthlyRevenue.toLocaleString('en-IN')}
                </h3>
                <p className="text-xs text-slate-500 mt-1">From {metrics.totalActive} active paid seats</p>
              </div>
            </div>

          </div>

          {/* Actionable Alerts Sidebar: Overdue & Due soon */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-xl flex flex-col overflow-hidden min-h-[500px] h-[550px]">
            <div className="px-4 py-3 border-b border-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-400" />
                <h4 className="text-base font-semibold text-slate-200">Due & Overdue Alerts</h4>
              </div>
              <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-400 rounded-full text-xs font-bold">
                {dueOrOverdue.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[460px]">
              {dueOrOverdue.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-8 text-slate-500">
                  <CheckCircle className="h-8 w-8 text-emerald-500/20 mb-2" />
                  <p className="text-sm">No pending dues or renewals</p>
                  <p className="text-xs text-slate-600">All student records are up to date.</p>
                </div>
              ) : (
                dueOrOverdue.map(student => {
                  const days = getDaysRemaining(student.renewalDate);
                  const isOverdue = days < 0;
                  const isDueToday = days === 0;
                  const isPendingPayment = days <= 0;
                  
                  return (
                    <div 
                      key={student._id} 
                      onClick={() => handleAlertCardClick(student)}
                      className={`p-3 rounded-lg border text-sm flex flex-col justify-between gap-2.5 transition-all cursor-pointer select-none ${
                        isPendingPayment 
                          ? 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/50 hover:bg-rose-500/10 hover:shadow-[0_0_12px_rgba(244,63,94,0.15)]' 
                          : 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/10 hover:shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-slate-200">{student.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">Seat #{student.seatNumber} • {student.contactNumber} • {student.shift || 'Day'} (₹{student.price || 500})</p>
                        </div>
                        {isOverdue ? (
                          <span className="px-1.5 py-0.5 bg-rose-500/15 text-rose-400 rounded text-xs font-semibold">
                            Overdue {Math.abs(days)}d
                          </span>
                        ) : isDueToday ? (
                          <span className="px-1.5 py-0.5 bg-rose-500/15 text-rose-400 rounded text-xs font-semibold">
                            Due Today
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-400 rounded text-xs font-semibold">
                            Due in {days}d
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-900/60 pt-2">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className={`h-1.5 w-1.5 rounded-full ${isPendingPayment ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                          <span className="text-slate-400">Payment:</span>
                          <span className={isPendingPayment ? 'text-rose-300 font-semibold' : 'text-emerald-300 font-semibold'}>
                            {isPendingPayment ? 'Pending' : 'Paid'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </section>
      </main>

      {/* ==============================================
          MODALS & DIALOGS (Radix UI wrapper styling)
          ============================================== */}



      {/* 2. OCCUPIED / MAINTENANCE DETAIL MODAL */}
      <Dialog.Root open={detailsModalOpen} onOpenChange={(val) => {
        setDetailsModalOpen(val);
        if(!val) {
          setConfirmVacate(false);
          setSelectedSeat(null);
        }
      }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-2xl max-h-[95vh] overflow-y-auto -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200 focus:outline-none">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <Dialog.Title className="text-2xl font-bold text-white flex items-center gap-2">
                <Info className="h-7 w-7 text-indigo-400" />
                Seat #{selectedSeat?.seatNumber} Details
              </Dialog.Title>
              <Dialog.Close className="text-slate-400 hover:text-white rounded-lg p-2 hover:bg-slate-800 transition cursor-pointer">
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>

            {selectedSeat?.status === 'Maintenance' ? (
              // Maintenance Details View
              <div className="pt-4 space-y-4">
                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex gap-3 text-sm leading-relaxed text-amber-300">
                  <Wrench className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-base">Under Maintenance</p>
                    <p className="text-slate-400 mt-1">This seat is currently unavailable for allocation. Make sure any hardware fixes or workspace cleaning are complete before restoring status.</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setDetailsModalOpen(false)}
                    className="px-4 py-2 bg-transparent hover:bg-slate-800 text-slate-400 font-semibold rounded-xl text-sm transition cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleToggleMaintenance(selectedSeat.seatNumber, 'Maintenance')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-900/20 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Restore to Available
                  </button>
                </div>
              </div>
            ) : selectedSeat?.currentStudentId ? (
              // Occupied Seat Student Details View
              <div className="pt-5 space-y-5 text-base">
                
                {/* Student Info Card */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-2xl font-bold text-white leading-tight">{selectedSeat.currentStudentId.name}</h4>
                      <p className="text-sm text-slate-500 mt-2 uppercase font-bold flex items-center gap-3">
                        Active Member
                        {selectedSeat.currentStudentId.studentId && (
                           <span className="font-mono bg-slate-800 text-slate-300 px-2.5 py-1 rounded normal-case text-xs tracking-widest">{selectedSeat.currentStudentId.studentId}</span>
                        )}
                      </p>
                    </div>
                    
                    <button 
                      onClick={() => {
                        setEditProfileForm({
                          name: selectedSeat.currentStudentId!.name,
                          contactNumber: selectedSeat.currentStudentId!.contactNumber,
                          shift: selectedSeat.currentStudentId!.shift || 'Day',
                          price: selectedSeat.currentStudentId!.price || 500
                        });
                        setEditProfileModalOpen(true);
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-indigo-400 rounded-lg text-sm font-semibold transition cursor-pointer"
                    >
                      <UserPlus className="h-4 w-4" />
                      Update Profile
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-y-4 gap-x-4 pt-4 border-t border-slate-900/80 text-sm">
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-slate-400" />
                      <a href={`tel:${selectedSeat.currentStudentId.contactNumber}`} className="text-slate-300 hover:underline hover:text-indigo-400 font-medium">
                        {selectedSeat.currentStudentId.contactNumber}
                      </a>
                    </div>
                    <div className="flex items-center gap-3">
                      <MessageCircle className="h-5 w-5 text-emerald-400" />
                      <a href={`https://wa.me/91${selectedSeat.currentStudentId.contactNumber}`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline hover:text-emerald-300 font-medium">
                        WhatsApp
                      </a>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-slate-400" />
                      <span className="text-slate-300 font-medium">Shift: {selectedSeat.currentStudentId.shift || 'Day'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="h-5 w-5 text-slate-400 font-bold text-sm flex items-center justify-center">₹</span>
                      <span className="text-slate-300 font-medium">Fee: ₹{selectedSeat.currentStudentId.price || 500}</span>
                    </div>
                  </div>
                </div>

                {/* Subscription and Renewal Card */}
                <div className="bg-slate-850 border border-slate-800/60 rounded-2xl p-6 space-y-4">
                  {(() => {
                    const days = getDaysRemaining(selectedSeat.currentStudentId.renewalDate);
                    const isPendingRenewal = days <= 0;
                    return (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400 font-semibold">Subscription Status:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold border ${
                          isPendingRenewal
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        }`}>
                          {isPendingRenewal ? 'Pending Renewal' : 'Paid'}
                        </span>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-2 gap-6 pt-3 border-t border-slate-800/40 text-sm">
                    <div className="space-y-1.5">
                      <span className="text-slate-500 block text-xs uppercase font-bold tracking-wider">Join Date</span>
                      <span className="text-slate-300 font-bold flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-slate-500" />
                        {new Date(selectedSeat.currentStudentId.joinDate).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-slate-500 block text-xs uppercase font-bold tracking-wider">Renewal Date</span>
                      <span className="text-slate-300 font-bold flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-slate-500" />
                        {new Date(selectedSeat.currentStudentId.renewalDate).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Days remaining indicator widget */}
                  <div className="pt-2">
                    {(() => {
                      const days = getDaysRemaining(selectedSeat.currentStudentId.renewalDate);
                      const isOverdue = days < 0;
                      const isDueToday = days === 0;
                      const isPendingPayment = days <= 0;
                      
                      return (
                        <div className={`p-4 rounded-xl border flex flex-col gap-3 ${
                          isPendingPayment 
                            ? 'bg-rose-500/5 border-rose-500/20 text-rose-400' 
                            : days <= 3 
                              ? 'bg-amber-500/5 border-amber-500/20 text-amber-400' 
                              : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                        }`}>
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                              <AlertCircle className="h-5 w-5" />
                              <span className="font-bold text-sm">
                                {isOverdue 
                                  ? `Subscription Overdue by ${Math.abs(days)} days!` 
                                  : isDueToday 
                                    ? 'Subscription renewal due TODAY!' 
                                    : `Subscription ends in ${days} days`}
                              </span>
                            </div>

                            <button
                              disabled={isPending || days > 3}
                              onClick={() => handleRenew(selectedSeat.currentStudentId!._id, selectedSeat.currentStudentId!.name)}
                              className={`px-4 py-2 rounded-lg font-bold text-sm transition border ${
                                days > 3
                                  ? 'bg-slate-950 border-slate-900 text-slate-600 cursor-not-allowed opacity-40'
                                  : isPendingPayment
                                    ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600 cursor-pointer'
                                    : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200 cursor-pointer'
                              }`}
                              title={days > 3 ? "Renewal becomes available 3 days before expiration" : undefined}
                            >
                              Collect
                            </button>
                          </div>
                        </div>

                      );
                    })()}
                  </div>
                </div>

                {/* Attendance Grid Section */}
                <div className="pt-4 space-y-4 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Attendance Calendar</span>
                    <span className="text-xs text-slate-300 font-bold bg-slate-800 px-3 py-1 rounded-full">
                      {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  
                  {studentAttendance === null ? (
                    <div className="h-24 flex items-center justify-center text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/80">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      <span className="text-sm font-medium">Loading attendance...</span>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800/80">
                      <div className="grid grid-cols-7 gap-2 mb-2 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                      </div>
                      <div className="grid grid-cols-7 gap-2">
                        {studentAttendance.length === 0 ? (
                          <div className="col-span-7">
                            <p className="text-sm text-slate-500 w-full text-center py-2">No attendance records found.</p>
                          </div>
                        ) : (
                          studentAttendance.map((day, i) => (
                            <div 
                              key={i} 
                              title={day.inRange ? `${day.date.toDateString()}: ${day.isFuture ? 'Future' : day.present ? 'Present' : 'Absent'}` : ''}
                              className={`
                                aspect-square rounded-lg flex flex-col items-center justify-center transition-all border
                                ${!day.inRange ? 'opacity-20 border-transparent bg-slate-900/50' : 'cursor-help'}
                                ${day.inRange && day.present ? 'bg-emerald-500 border-emerald-400 text-emerald-950 shadow-sm shadow-emerald-500/30' : ''}
                                ${day.inRange && !day.present && !day.isFuture ? 'bg-rose-500 border-rose-400 text-rose-50 shadow-sm shadow-rose-500/30' : ''}
                                ${day.isFuture ? 'bg-slate-900/40 border-slate-800/50 text-slate-600' : ''}
                              `}
                            >
                              <span className="text-xs font-bold">{day.date.getDate()}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-6 text-xs text-slate-400 pt-2">
                    <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-sm bg-emerald-500 border border-emerald-400"></div>Present</div>
                    <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-sm bg-rose-500 border border-rose-400"></div>Absent</div>
                  </div>
                </div>

                {/* Danger actions and changes section */}
                <div className="pt-2 space-y-3 border-t border-slate-800">
                  
                  {confirmVacate ? (
                    <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl space-y-3 text-slate-300">
                      <p className="font-semibold text-rose-400 flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4 text-rose-400" />
                        Confirm Vacating Seat?
                      </p>
                      <p className="text-xs text-slate-400 leading-normal">
                        This action will set the student subscription status to inactive (archiving records for database history) and free Seat #{selectedSeat.seatNumber} immediately.
                      </p>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmVacate(false)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={handleVacate}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                        >
                          {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                          Yes, Vacate Seat
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setTargetSeatNum('');
                          setChangeSeatModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-transparent hover:bg-indigo-500/10 border border-slate-800 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-400 font-semibold rounded-xl text-xs transition cursor-pointer"
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                        Transfer Seat
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmVacate(true)}
                        className="px-3 py-2 bg-transparent hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 font-semibold rounded-xl text-xs transition cursor-pointer"
                      >
                        Vacate Seat
                      </button>
                    </div>
                  )}

                </div>

              </div>
            ) : null}

          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* 2.5 UPDATE PROFILE MODAL */}
      <Dialog.Root open={editProfileModalOpen} onOpenChange={setEditProfileModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 focus:outline-none">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <Dialog.Title className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-indigo-400" />
                Update Profile
              </Dialog.Title>
              <Dialog.Close className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-slate-800 transition cursor-pointer">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            <form onSubmit={handleEditProfileSubmit} className="space-y-4 pt-4 text-sm">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={editProfileForm.name}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, name: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700/80 focus:border-indigo-500/80 rounded-xl p-2.5 text-sm text-white focus:outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact Number</label>
                <input 
                  type="text" 
                  required
                  maxLength={10}
                  pattern="\d{10}"
                  value={editProfileForm.contactNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 10) {
                      setEditProfileForm({ ...editProfileForm, contactNumber: val });
                    }
                  }}
                  className="w-full bg-slate-800/80 border border-slate-700/80 focus:border-indigo-500/80 rounded-xl p-2.5 text-sm text-white focus:outline-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Shift</label>
                  <select
                    value={editProfileForm.shift}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, shift: e.target.value })}
                    className="w-full bg-slate-800/80 border border-slate-700/80 focus:border-indigo-500/80 rounded-xl p-2.5 text-sm text-white focus:outline-none transition cursor-pointer"
                  >
                    <option value="Day">Day</option>
                    <option value="Night">Night</option>
                    <option value="Day & Night">Day & Night</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fee (₹)</label>
                  <input 
                    type="number" 
                    required
                    value={editProfileForm.price}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, price: Number(e.target.value) })}
                    className="w-full bg-slate-800/80 border border-slate-700/80 focus:border-indigo-500/80 rounded-xl p-2.5 text-sm text-white focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditProfileModalOpen(false)}
                  className="px-4 py-2 bg-transparent hover:bg-slate-800 text-slate-400 font-semibold rounded-xl text-sm transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-900/20 transition flex items-center gap-1.5 cursor-pointer"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* 3. CHANGE SEAT MODAL */}
      <Dialog.Root open={changeSeatModalOpen} onOpenChange={setChangeSeatModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 focus:outline-none">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <Dialog.Title className="text-lg font-bold text-white flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-indigo-400" />
                Change Seat for {selectedSeat?.currentStudentId?.name}
              </Dialog.Title>
              <Dialog.Close className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-slate-800 transition cursor-pointer">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            <form onSubmit={handleChangeSeatSubmit} className="space-y-4 pt-4 text-sm">
              <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-sm text-slate-400 leading-normal">
                Moving member from current <span className="text-white font-semibold">Seat #{selectedSeat?.seatNumber}</span> to a new available seat.
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Available Seat</label>
                {availableSeatNumbers.length === 0 ? (
                  <p className="text-rose-400 font-semibold py-2">No other seats are currently available!</p>
                ) : (
                  <select
                    required
                    value={targetSeatNum}
                    onChange={(e) => setTargetSeatNum(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700/80 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/20 rounded-xl p-2.5 text-sm text-white focus:outline-none transition cursor-pointer"
                  >
                    <option value="">Choose a vacant seat...</option>
                    {availableSeatNumbers.map(num => (
                      <option key={num} value={num}>Seat #{num}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setChangeSeatModalOpen(false)}
                  className="px-4 py-2 bg-transparent hover:bg-slate-800 text-slate-400 font-semibold rounded-xl text-sm transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !targetSeatNum}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-900/20 transition flex items-center gap-1.5 cursor-pointer"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Confirm Reallocation
                </button>
              </div>
            </form>

          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </div>
  );
}
