'use client';

import React, { useState, useTransition, useMemo } from 'react';

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
  CreditCard
} from 'lucide-react';
import { allotSeat, renewSubscription, vacateSeat, changeSeat, toggleMaintenance } from '../actions/crmActions';

interface StudentData {
  _id: string;
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
  initialSeats: SeatData[];
  initialDueOrOverdue: StudentData[];
  initialMetrics: Metrics;
  adminEmail?: string;
}

export default function Dashboard({ 
  initialSeats, 
  initialDueOrOverdue, 
  initialMetrics,
  adminEmail = 'Chhaya Admin'
}: DashboardProps) {
  const [isPending, startTransition] = useTransition();
  const [seats, setSeats] = useState<SeatData[]>(initialSeats);
  const [dueOrOverdue, setDueOrOverdue] = useState<StudentData[]>(initialDueOrOverdue);
  const [metrics, setMetrics] = useState<Metrics>(initialMetrics);
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
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

  const [changeSeatModalOpen, setChangeSeatModalOpen] = useState(false);
  const [targetSeatNum, setTargetSeatNum] = useState<string>('');

  const [confirmVacate, setConfirmVacate] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form states for Alloting Seat
  const [allotForm, setAllotForm] = useState({
    name: '',
    contactNumber: '',
    joinDate: new Date().toISOString().split('T')[0],
    paymentStatus: 'Paid' as 'Paid' | 'Pending',
    paymentMethod: 'UPI' as 'Cash' | 'UPI' | 'Bank Transfer',
    shift: 'Day' as 'Day' | 'Night' | 'Day & Night'
  });

  // Show customized toasts
  const triggerToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Helper: Refresh dashboard data client-side after actions
  const refreshData = async () => {
    // We can call getDashboardData or import it dynamically. Since it's a server action:
    const { getDashboardData } = await import('../actions/crmActions');
    const res = await getDashboardData();
    if (res.success && res.seats) {
      setSeats(res.seats);
      setDueOrOverdue(res.dueOrOverdueStudents || []);
      setMetrics(res.metrics || initialMetrics);
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
      const res = await allotSeat({
        name: allotForm.name,
        contactNumber: allotForm.contactNumber,
        seatNumber: allotSeatNum,
        joinDate: allotForm.joinDate,
        paymentStatus: allotForm.paymentStatus,
        paymentMethod: allotForm.paymentMethod,
        shift: allotForm.shift
      });

      if (res.success) {
        triggerToast(`Seat ${allotSeatNum} successfully allotted to ${allotForm.name}!`, 'success');
        setAllotModalOpen(false);
        setAllotForm({
          name: '',
          contactNumber: '',
          joinDate: new Date().toISOString().split('T')[0],
          paymentStatus: 'Paid',
          paymentMethod: 'UPI',
          shift: 'Day'
        });
        await refreshData();
      } else {
        triggerToast(res.error || 'Failed to allot seat', 'error');
      }
    });
  };

  const handleRenew = async (studentId: string, studentName: string) => {
    startTransition(async () => {
      const res = await renewSubscription(studentId);
      if (res.success) {
        triggerToast(`Extended subscription for ${studentName} by 30 days.`, 'success');
        await refreshData();
        // If details modal is open for this student, update selected seat view
        if (selectedSeat?.currentStudentId?._id === studentId) {
          const updatedSeat = seats.find(s => s._id === selectedSeat._id);
          if (updatedSeat) {
            // Re-fetch to update state
            setTimeout(async () => {
              const { getDashboardData } = await import('../actions/crmActions');
              const r = await getDashboardData();
              if (r.success) {
                const refreshedSeat = r.seats?.find((s: any) => s._id === selectedSeat._id);
                if (refreshedSeat) setSelectedSeat(refreshedSeat);
              }
            }, 200);
          }
        }
      } else {
        triggerToast(res.error || 'Failed to renew subscription', 'error');
      }
    });
  };

  const handleVacate = async () => {
    if (!selectedSeat || !selectedSeat.currentStudentId) return;
    const { seatNumber, currentStudentId } = selectedSeat;
    
    startTransition(async () => {
      const res = await vacateSeat(seatNumber, currentStudentId._id);
      if (res.success) {
        triggerToast(`Seat ${seatNumber} is now vacant. Record archived.`, 'success');
        setConfirmVacate(false);
        setDetailsModalOpen(false);
        setSelectedSeat(null);
        await refreshData();
      } else {
        triggerToast(res.error || 'Failed to vacate seat', 'error');
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
      const res = await changeSeat(student._id, oldSeat, newSeat);
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
    });
  };

  const handleToggleMaintenance = async (seatNum: number, currentStatus: 'Available' | 'Maintenance') => {
    startTransition(async () => {
      const res = await toggleMaintenance(seatNum, currentStatus);
      if (res.success) {
        const next = res.nextStatus === 'Maintenance' ? 'placed under maintenance' : 'restored to available';
        triggerToast(`Seat ${seatNum} has been ${next}.`, 'success');
        setDetailsModalOpen(false);
        setSelectedSeat(null);
        await refreshData();
      } else {
        triggerToast(res.error || 'Failed to change maintenance status', 'error');
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
      setAllotModalOpen(true);
    } else {
      setSelectedSeat(seat);
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
          <div className="h-9 w-9 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-400 bg-clip-text text-transparent">
              Chhaya Library Managemant 
            </h1>
            <p className="text-xs text-emerald-400/80 font-medium">Seat & Payment Manager</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-semibold text-slate-300">{adminEmail}</span>
            <span className="text-[10px] text-emerald-400 font-medium flex items-center justify-end gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              Owner Admin
            </span>
          </div>
          <button 
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-medium rounded-lg transition duration-200 cursor-pointer"
          >
            <Home className="h-3.5 w-3.5 text-emerald-400" />
            Home Page
          </button>
        </div>
      </header>

      {/* Main content split dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Sidebar Controls and Metrics */}
        <section className="lg:col-span-1 space-y-6 flex flex-col h-fit">
          
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
            
            {/* Occupancy Card */}
            <div className="relative overflow-hidden bg-slate-900/40 border border-slate-900 p-4 rounded-xl flex flex-col justify-between h-32 group hover:border-indigo-500/20 transition-all duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Users className="h-20 w-20 text-indigo-400" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Occupancy Rate</span>
                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-[10px] font-semibold">
                  {Math.round((metrics.totalOccupied / 150) * 100)}%
                </span>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-bold text-white tracking-tight">{metrics.totalOccupied} / 150</h3>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${(metrics.totalOccupied / 150) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Revenue Card */}
            <div className="relative overflow-hidden bg-slate-900/40 border border-slate-900 p-4 rounded-xl flex flex-col justify-between h-32 group hover:border-emerald-500/20 transition-all duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <DollarSign className="h-20 w-20 text-emerald-400" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Monthly Collection</span>
                <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-emerald-400" />
                  This Month
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-emerald-400 tracking-tight">
                  ₹{metrics.monthlyRevenue.toLocaleString('en-IN')}
                </h3>
                <p className="text-[10px] text-slate-500 mt-1">From {metrics.totalActive} active paid seats</p>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="col-span-2 lg:col-span-1 bg-slate-900/30 border border-slate-900 p-4 rounded-xl space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Seat Availability Status</h4>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="bg-slate-900/60 border border-slate-800/80 p-2.5 rounded-lg text-center">
                  <span className="block text-xs text-slate-500">Available</span>
                  <span className="text-lg font-bold text-emerald-400">{metrics.totalAvailable}</span>
                </div>
                <div className="bg-slate-900/60 border border-slate-800/80 p-2.5 rounded-lg text-center">
                  <span className="block text-xs text-slate-500">Occupied</span>
                  <span className="text-lg font-bold text-rose-400">{metrics.totalOccupied}</span>
                </div>
                <div className="bg-slate-900/60 border border-slate-800/80 p-2.5 rounded-lg text-center">
                  <span className="block text-xs text-slate-500">Service</span>
                  <span className="text-lg font-bold text-amber-400">{metrics.totalMaintenance}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Actionable Alerts Sidebar: Overdue & Due soon */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-xl flex-1 flex flex-col overflow-hidden min-h-[300px]">
            <div className="px-4 py-3 border-b border-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-400" />
                <h4 className="text-sm font-semibold text-slate-200">Due & Overdue Alerts</h4>
              </div>
              <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-400 rounded-full text-[10px] font-bold">
                {dueOrOverdue.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[350px] lg:max-h-none">
              {dueOrOverdue.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-8 text-slate-500">
                  <CheckCircle className="h-8 w-8 text-emerald-500/20 mb-2" />
                  <p className="text-xs">No pending dues or renewals</p>
                  <p className="text-[10px] text-slate-600">All student records are up to date.</p>
                </div>
              ) : (
                dueOrOverdue.map(student => {
                  const days = getDaysRemaining(student.renewalDate);
                  const isOverdue = days < 0;
                  const isPendingPayment = student.paymentStatus === 'Pending';
                  
                  return (
                    <div 
                      key={student._id} 
                      className={`p-3 rounded-lg border text-xs flex flex-col justify-between gap-2.5 transition-colors ${
                        isOverdue 
                          ? 'bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10' 
                          : 'bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-slate-200">{student.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Seat #{student.seatNumber} • {student.contactNumber} • {student.shift || 'Day'} (₹{student.price || 500})</p>
                        </div>
                        {isOverdue ? (
                          <span className="px-1.5 py-0.5 bg-rose-500/15 text-rose-400 rounded text-[9px] font-semibold">
                            Overdue {Math.abs(days)}d
                          </span>
                        ) : days === 0 ? (
                          <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-400 rounded text-[9px] font-semibold">
                            Due Today
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-400 rounded text-[9px] font-semibold">
                            Due in {days}d
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-900/60 pt-2">
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className={`h-1.5 w-1.5 rounded-full ${isPendingPayment ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                          <span className="text-slate-400">Payment:</span>
                          <span className={isPendingPayment ? 'text-rose-300 font-semibold' : 'text-emerald-300 font-semibold'}>
                            {student.paymentStatus}
                          </span>
                        </div>

                        <button
                          disabled={isPending}
                          onClick={() => handleRenew(student._id, student.name)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-indigo-600 hover:text-white border border-slate-800 hover:border-indigo-500 text-indigo-400 rounded-md text-[10px] font-semibold flex items-center gap-1 transition-all duration-200 cursor-pointer disabled:opacity-50"
                        >
                          {isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          Renew
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </section>

        {/* Main Grid View */}
        <section className="lg:col-span-3 flex flex-col bg-slate-900/20 border border-slate-900 rounded-xl p-4 lg:p-6 space-y-6">
          
          {/* Grid Header & Search Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Workspace Seat Map
                <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full text-xs font-semibold">
                  150 Seats Total
                </span>
              </h2>
              <p className="text-xs text-slate-400">Click a seat to manage allocation, billing, and maintenance.</p>
            </div>

            {/* Elegant search input */}
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search student or seat..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900/60 border border-slate-800 rounded-xl text-xs placeholder:text-slate-500 text-white focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Color Indicator Legend */}
          <div className="flex flex-wrap items-center gap-5 text-xs text-slate-400 border-b border-slate-900 pb-4">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Legend:</span>
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
              <div className="ml-auto text-[11px] text-indigo-400 font-semibold animate-pulse">
                Filtered matches are highlighted
              </div>
            )}
          </div>

          {/* The 150-Seat Grid */}
          <div className="flex-1 flex justify-center items-center">
            <div className="grid grid-cols-5 md:grid-cols-10 xl:grid-cols-[repeat(15,minmax(0,1fr))] gap-2.5 w-full">
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
                    className={`group relative aspect-square flex flex-col items-center justify-center rounded-xl border font-bold text-sm transition-all duration-200 cursor-pointer select-none ${
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
                          <p className="font-bold text-xs text-white leading-tight truncate">{tooltipContent.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-none flex items-center gap-1">
                            <Phone className="h-2.5 w-2.5 text-slate-500" />
                            {tooltipContent.phone}
                          </p>
                          
                          <div className="border-t border-slate-800/80 my-2 pt-1.5 flex items-center justify-between">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              tooltipContent.isOverdue 
                                ? 'bg-rose-500/15 text-rose-400' 
                                : 'bg-emerald-500/15 text-emerald-400'
                            }`}>
                              {tooltipContent.daysText}
                            </span>
                            <span className={`text-[9px] font-semibold ${
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

          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-2 border-t border-slate-900">
            <Info className="h-3.5 w-3.5 text-slate-500" />
            <span>Click any occupied seat to view invoice history, renew payment, reallocate to a different seat, or vacate.</span>
          </div>
        </section>

      </main>

      {/* ==============================================
          MODALS & DIALOGS (Radix UI wrapper styling)
          ============================================== */}

      {/* 1. ALLOT SEAT MODAL */}
      <Dialog.Root open={allotModalOpen} onOpenChange={setAllotModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 focus:outline-none">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <Dialog.Title className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-indigo-400" />
                Allot Seat #{allotSeatNum}
              </Dialog.Title>
              <Dialog.Close className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-slate-800 transition cursor-pointer">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            <form onSubmit={handleAllotSubmit} className="space-y-4 pt-4 text-sm">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Student Full Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={allotForm.name}
                  onChange={(e) => setAllotForm({ ...allotForm, name: e.target.value })}
                  className="w-full bg-slate-800/80 border border-slate-700/80 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/20 rounded-xl p-2.5 text-white placeholder:text-slate-500 focus:outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Phone / Contact Number *</label>
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
                  className="w-full bg-slate-800/80 border border-slate-700/80 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/20 rounded-xl p-2.5 text-white placeholder:text-slate-500 focus:outline-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Join Date</label>
                  <input 
                    type="date"
                    value={allotForm.joinDate}
                    onChange={(e) => setAllotForm({ ...allotForm, joinDate: e.target.value })}
                    className="w-full bg-slate-800/80 border border-slate-700/80 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/20 rounded-xl p-2.5 text-white focus:outline-none transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Payment Method</label>
                  <select
                    value={allotForm.paymentMethod}
                    onChange={(e) => setAllotForm({ ...allotForm, paymentMethod: e.target.value as any })}
                    className="w-full bg-slate-800/80 border border-slate-700/80 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/20 rounded-xl p-2.5 text-white focus:outline-none transition cursor-pointer"
                  >
                    <option value="UPI">UPI Transfer</option>
                    <option value="Cash">Cash payment</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Shift</label>
                <select
                  value={allotForm.shift}
                  onChange={(e) => setAllotForm({ ...allotForm, shift: e.target.value as any })}
                  className="w-full bg-slate-800/80 border border-slate-700/80 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/20 rounded-xl p-2.5 text-white focus:outline-none transition cursor-pointer"
                >
                  <option value="Day">Day Shift — ₹500/mo</option>
                  <option value="Night">Night Shift — ₹500/mo</option>
                  <option value="Day & Night">Day & Night Shift — ₹900/mo</option>
                </select>
              </div>

              <div className="bg-slate-800/40 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <span className="block text-xs font-semibold text-slate-300">Collect Subscription Payment</span>
                  <span className="text-[10px] text-slate-500">Calculated Rate: ₹{allotForm.shift === 'Day & Night' ? 900 : 500} / mo</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAllotForm({ ...allotForm, paymentStatus: 'Paid' })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                      allotForm.paymentStatus === 'Paid'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-sm'
                        : 'bg-transparent border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Paid
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllotForm({ ...allotForm, paymentStatus: 'Pending' })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                      allotForm.paymentStatus === 'Pending'
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-400 shadow-sm'
                        : 'bg-transparent border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Pending
                  </button>
                </div>
              </div>

              <div className="pt-4 flex items-center gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    if (allotSeatNum) handleToggleMaintenance(allotSeatNum, 'Available');
                    setAllotModalOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-transparent hover:bg-amber-500/10 border border-slate-800 hover:border-amber-500/30 text-slate-400 hover:text-amber-400 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  Service Seat
                </button>

                <div className="flex-1 flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setAllotModalOpen(false)}
                    className="px-4 py-2 bg-transparent hover:bg-slate-800 text-slate-400 font-semibold rounded-xl text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-900/20 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Confirm Allocation
                  </button>
                </div>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

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
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 focus:outline-none">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <Dialog.Title className="text-lg font-bold text-white flex items-center gap-2">
                <Info className="h-5 w-5 text-indigo-400" />
                Seat #{selectedSeat?.seatNumber} Details
              </Dialog.Title>
              <Dialog.Close className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-slate-800 transition cursor-pointer">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            {selectedSeat?.status === 'Maintenance' ? (
              // Maintenance Details View
              <div className="pt-4 space-y-4">
                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex gap-3 text-xs leading-relaxed text-amber-300">
                  <Wrench className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Under Maintenance</p>
                    <p className="text-slate-400 mt-1">This seat is currently unavailable for allocation. Make sure any hardware fixes or workspace cleaning are complete before restoring status.</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setDetailsModalOpen(false)}
                    className="px-4 py-2 bg-transparent hover:bg-slate-800 text-slate-400 font-semibold rounded-xl text-xs transition cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleToggleMaintenance(selectedSeat.seatNumber, 'Maintenance')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-900/20 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Restore to Available
                  </button>
                </div>
              </div>
            ) : selectedSeat?.currentStudentId ? (
              // Occupied Seat Student Details View
              <div className="pt-4 space-y-4 text-xs">
                
                {/* Student Info Card */}
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white leading-tight">{selectedSeat.currentStudentId.name}</h4>
                      <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">Active Member</p>
                    </div>
                    
                    <button 
                      onClick={() => copyToClipboard(selectedSeat.currentStudentId!.contactNumber)}
                      className="flex items-center gap-1.5 px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-indigo-400 rounded-lg text-[10px] font-semibold transition cursor-pointer"
                    >
                      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      Copy Contact
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-y-2.5 gap-x-3 pt-2.5 border-t border-slate-900/80 text-[11px]">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <a href={`tel:${selectedSeat.currentStudentId.contactNumber}`} className="text-slate-300 hover:underline hover:text-indigo-400">
                        {selectedSeat.currentStudentId.contactNumber}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-slate-300">Method: {selectedSeat.currentStudentId.paymentMethod}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-slate-300">Shift: {selectedSeat.currentStudentId.shift || 'Day'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 text-slate-400 font-semibold text-[10px]">₹</span>
                      <span className="text-slate-300">Fee: ₹{selectedSeat.currentStudentId.price || 500}</span>
                    </div>
                  </div>
                </div>

                {/* Subscription and Renewal Card */}
                <div className="bg-slate-850 border border-slate-800/60 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Subscription Status:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      selectedSeat.currentStudentId.paymentStatus === 'Paid'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    }`}>
                      {selectedSeat.currentStudentId.paymentStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1.5 border-t border-slate-800/40 text-[11px]">
                    <div className="space-y-1">
                      <span className="text-slate-500 block text-[9px] uppercase font-semibold">Join Date</span>
                      <span className="text-slate-300 font-medium flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        {new Date(selectedSeat.currentStudentId.joinDate).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-slate-500 block text-[9px] uppercase font-semibold">Renewal Date</span>
                      <span className="text-slate-300 font-medium flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
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
                      
                      return (
                        <div className={`p-3 rounded-lg border flex items-center justify-between ${
                          isOverdue 
                            ? 'bg-rose-500/5 border-rose-500/20 text-rose-400' 
                            : days <= 3 
                              ? 'bg-amber-500/5 border-amber-500/20 text-amber-400' 
                              : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                        }`}>
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            <span className="font-semibold">
                              {isOverdue 
                                ? `Subscription Overdue by ${Math.abs(days)} days!` 
                                : days === 0 
                                  ? 'Subscription renewal due TODAY!' 
                                  : `Subscription ends in ${days} days`}
                            </span>
                          </div>

                          <button
                            disabled={isPending}
                            onClick={() => handleRenew(selectedSeat.currentStudentId!._id, selectedSeat.currentStudentId!.name)}
                            className={`px-3 py-1.5 rounded-lg font-bold text-[10px] transition cursor-pointer border ${
                              isOverdue
                                ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600'
                                : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
                            }`}
                          >
                            Collect Renewal
                          </button>
                        </div>
                      );
                    })()}
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
                      <p className="text-[10px] text-slate-400 leading-normal">
                        This action will set the student subscription status to inactive (archiving records for database history) and free Seat #{selectedSeat.seatNumber} immediately.
                      </p>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmVacate(false)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 font-semibold rounded-lg text-[10px] cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={handleVacate}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer"
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
                        className="flex items-center gap-1.5 px-3 py-2 bg-transparent hover:bg-indigo-500/10 border border-slate-800 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-400 font-semibold rounded-xl transition cursor-pointer"
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                        Transfer Seat
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmVacate(true)}
                        className="px-3 py-2 bg-transparent hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 font-semibold rounded-xl transition cursor-pointer"
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

      {/* 3. CHANGE SEAT MODAL */}
      <Dialog.Root open={changeSeatModalOpen} onOpenChange={setChangeSeatModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 focus:outline-none">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <Dialog.Title className="text-md font-bold text-white flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-indigo-400" />
                Change Seat for {selectedSeat?.currentStudentId?.name}
              </Dialog.Title>
              <Dialog.Close className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-slate-800 transition cursor-pointer">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            <form onSubmit={handleChangeSeatSubmit} className="space-y-4 pt-4 text-xs">
              <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-slate-400 leading-normal">
                Moving member from current <span className="text-white font-semibold">Seat #{selectedSeat?.seatNumber}</span> to a new available seat.
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Select Available Seat</label>
                {availableSeatNumbers.length === 0 ? (
                  <p className="text-rose-400 font-semibold py-2">No other seats are currently available!</p>
                ) : (
                  <select
                    required
                    value={targetSeatNum}
                    onChange={(e) => setTargetSeatNum(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700/80 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/20 rounded-xl p-2.5 text-white focus:outline-none transition cursor-pointer"
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
                  className="px-4 py-2 bg-transparent hover:bg-slate-800 text-slate-400 font-semibold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !targetSeatNum}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-900/20 transition flex items-center gap-1.5 cursor-pointer"
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
