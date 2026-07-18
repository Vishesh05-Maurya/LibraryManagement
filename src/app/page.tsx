'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Compass, LayoutGrid, Users, ArrowRight, Library, ShieldAlert, Zap, Clock, TrendingUp, CheckCircle2, Wifi, Droplets, Wind, Car, Newspaper } from 'lucide-react';

export default function LandingPage() {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    const x = (e.clientX - window.innerWidth / 2) / 35;
    const y = (e.clientY - window.innerHeight / 2) / 35;
    setCoords({ x, y });
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div 
      onMouseMove={handleMouseMove}
      className="min-h-screen bg-transparent text-slate-100 flex flex-col relative overflow-x-hidden font-sans select-none"
    >
      {/* Fixed Background Image */}
      <img src="/bg.png" alt="Library Background" className="fixed inset-0 w-full h-full object-cover -z-10 pointer-events-none opacity-40 mix-blend-screen" />
      
      {/* Dynamic Grid Overlay */}
      <div 
        className="fixed inset-0 opacity-[0.03] pointer-events-none -z-10"
        style={{
          backgroundImage: 'radial-gradient(circle, #10b981 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      ></div>

      {/* Floating neon light orbs (Fixed) */}
      <div className="fixed top-1/4 left-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-[120px] animate-pulse pointer-events-none -z-10"></div>
      <div className="fixed bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px] animate-pulse pointer-events-none -z-10" style={{ animationDelay: '2s' }}></div>
      <div className="fixed top-3/4 left-1/2 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-[120px] animate-pulse pointer-events-none -z-10" style={{ animationDelay: '4s' }}></div>

      {/* Navbar */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <Library className="w-8 h-8 text-emerald-400" />
          <span className="text-xl font-bold bg-linear-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Chhaya Study Hub</span>
        </div>
        <Link href="/workspace" className="text-sm font-semibold text-white/80 hover:text-white transition-colors">
          Open Dashboard
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto w-full px-6 pt-12 pb-32 flex flex-col lg:flex-row items-center justify-between gap-12">
        {/* Left Side: Copy and Title */}
        <div className="flex-1 text-center lg:text-left space-y-8 z-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <Zap className="h-4 w-4 text-yellow-400" />
            Next-Gen Library Management System
          </div>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
            Manage Your Library <br />
            <span className="bg-linear-to-r from-emerald-300 via-cyan-300 to-fuchsia-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">
              Is now Under Your Command
            </span>
          </h1>

          <p className="text-slate-300 text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
            Elevate your workspace with real-time seat tracking, automated subscription renewals, and seamless customer management inside a stunning, high-fidelity digital ecosystem.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center gap-5 justify-center lg:justify-start">
            <Link 
              href="/workspace"
              className="group relative px-8 py-4 bg-linear-to-r from-emerald-500 via-teal-500 to-cyan-600 text-white font-extrabold text-lg rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:shadow-[0_0_40px_rgba(6,182,212,0.6)] hover:scale-105 transition-all duration-300 flex items-center gap-3 overflow-hidden"
            >
              <span className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></span>
              Launch Workspace
              <ArrowRight className="h-5 w-5 group-hover:translate-x-2 transition-transform duration-300" />
            </Link>
            
            <Link 
              href="/attendance"
              className="px-8 py-4 bg-slate-900/50 hover:bg-slate-800/80 border border-slate-700 hover:border-emerald-500/50 text-slate-300 hover:text-white font-bold text-lg rounded-2xl backdrop-blur-md transition-all duration-300 flex items-center gap-3"
            >
              Mark Attendance
            </Link>
          </div>
        </div>

        {/* Right Side: Interactive Floating 3D Seat Grid Component */}
        <div 
          className="flex-1 flex items-center justify-center relative w-full max-w-[500px] z-10"
          style={{ transform: `perspective(1000px) rotateX(${-coords.y}deg) rotateY(${coords.x}deg)` }}
        >
          <div className="w-80 h-80 relative" style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}>
            <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 gap-4 animate-float" style={{ transform: 'rotateX(60deg) rotateZ(-45deg)', transformStyle: 'preserve-3d' }}>
              {Array.from({ length: 16 }).map((_, i) => {
                const isOccupied = i % 5 === 1;
                const isMaintenance = i % 11 === 3;
                let bgClass = 'bg-emerald-500/30 border-emerald-400/50 shadow-[0_0_15px_rgba(52,211,153,0.3)] text-emerald-300';
                if (isOccupied) bgClass = 'bg-rose-500/30 border-rose-400/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] text-rose-300';
                else if (isMaintenance) bgClass = 'bg-amber-500/30 border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.3)] text-amber-300';

                return (
                  <div
                    key={i}
                    className={`border-2 rounded-xl flex items-center justify-center text-[11px] font-extrabold backdrop-blur-md transition-transform duration-500 ${bgClass}`}
                    style={{
                      transform: `translateZ(${i % 3 === 0 ? '20px' : '0px'})`,
                      transformStyle: 'preserve-3d',
                      animation: `pulse-seat 3s infinite ease-in-out`,
                      animationDelay: `${i * 150}ms`
                    }}
                  >
                    S-{i + 1}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20 border-t border-slate-800/50 bg-slate-950/20 backdrop-blur-sm rounded-3xl mb-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6">Everything you need to <span className="bg-linear-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">succeed</span></h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">Powerful tools built specifically for modern libraries and co-working spaces to manage members efficiently.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 p-8 rounded-3xl backdrop-blur-xl transition-all hover:-translate-y-2 group shadow-xl">
            <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <LayoutGrid className="w-7 h-7 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Live Seat Mapping</h3>
            <p className="text-slate-400 leading-relaxed">Visualize your entire floor plan. Instantly know which seats are occupied, vacant, or under maintenance.</p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 p-8 rounded-3xl backdrop-blur-xl transition-all hover:-translate-y-2 group shadow-xl">
            <div className="w-14 h-14 bg-cyan-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Users className="w-7 h-7 text-cyan-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Member Profiles</h3>
            <p className="text-slate-400 leading-relaxed">Keep track of every student's details, shift timings, and contact info directly from a central hub.</p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 hover:border-fuchsia-500/50 p-8 rounded-3xl backdrop-blur-xl transition-all hover:-translate-y-2 group shadow-xl">
            <div className="w-14 h-14 bg-fuchsia-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Clock className="w-7 h-7 text-fuchsia-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Automated Alerts</h3>
            <p className="text-slate-400 leading-relaxed">Never miss a payment. Get automated highlights for due and overdue subscriptions in your dashboard.</p>
          </div>
        </div>
      </section>

      {/* Premium Facilities Section */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-6 mb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">World-Class <span className="bg-linear-to-r from-emerald-400 to-yellow-400 bg-clip-text text-transparent">Facilities</span></h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">Equipped with everything you need for maximum focus and uncompromised comfort.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { icon: <Wifi className="w-6 h-6 text-emerald-400" />, title: "24/7 Wi-Fi", color: "hover:border-emerald-500/50 hover:shadow-emerald-500/20" },
            { icon: <Droplets className="w-6 h-6 text-cyan-400" />, title: "RO Water + Cooling System", color: "hover:border-cyan-500/50 hover:shadow-cyan-500/20" },
            { icon: <Wind className="w-6 h-6 text-fuchsia-400" />, title: "Fully AC", color: "hover:border-fuchsia-500/50 hover:shadow-fuchsia-500/20" },
            { icon: <Car className="w-6 h-6 text-yellow-400" />, title: "Parking Area", color: "hover:border-yellow-500/50 hover:shadow-yellow-500/20" },
            { icon: <Newspaper className="w-6 h-6 text-rose-400" />, title: "Daily News", color: "hover:border-rose-500/50 hover:shadow-rose-500/20" },
            { icon: <Clock className="w-6 h-6 text-indigo-400" />, title: "Flexible Shifts", color: "hover:border-indigo-500/50 hover:shadow-indigo-500/20" }
          ].map((item, idx) => (
            <div 
              key={idx} 
              className={`bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-md flex flex-col items-center justify-center gap-4 transition-all duration-300 hover:-translate-y-2 hover:bg-slate-900/80 shadow-lg cursor-default group ${item.color}`} 
              style={{ animation: `float-y ${4 + (idx % 3)}s infinite ease-in-out`, animationDelay: `${idx * 0.2}s` }}
            >
              <div className="p-3 bg-slate-800/50 rounded-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                {item.icon}
              </div>
              <h3 className="text-slate-200 font-bold text-sm text-center tracking-wide">{item.title}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 w-full bg-linear-to-r from-emerald-900/40 via-slate-900/80 to-cyan-900/40 border-y border-slate-800/80 backdrop-blur-xl py-16 mb-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl md:text-5xl font-extrabold text-white mb-2 drop-shadow-lg shadow-emerald-500/50">150+</div>
            <div className="text-emerald-400 font-semibold tracking-wider text-sm uppercase">Active Members</div>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-extrabold text-white mb-2 drop-shadow-lg shadow-cyan-500/50">99.9%</div>
            <div className="text-cyan-400 font-semibold tracking-wider text-sm uppercase">Uptime</div>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-extrabold text-white mb-2 drop-shadow-lg shadow-fuchsia-500/50">24/7</div>
            <div className="text-fuchsia-400 font-semibold tracking-wider text-sm uppercase">Accessibility</div>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-extrabold text-white mb-2 drop-shadow-lg shadow-yellow-500/50">0</div>
            <div className="text-yellow-400 font-semibold tracking-wider text-sm uppercase">Complexity</div>
          </div>
        </div>
      </section>

      {/* Global CSS for 3D Floating Animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: rotateX(60deg) rotateZ(-45deg) translateZ(0px); }
          50% { transform: rotateX(62deg) rotateZ(-43deg) translateZ(25px); }
        }
        @keyframes float-y {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-float {
          animation: float 8s infinite ease-in-out;
          transform-style: preserve-3d;
        }
        @keyframes pulse-seat {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; filter: brightness(1.3); }
        }
      `}</style>
      
      {/* Footer */}
      <footer className="w-full py-8 border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-xl text-center z-10 mt-auto">
        <p className="text-sm text-slate-500 font-medium flex items-center justify-center gap-2">
          <Compass className="h-4 w-4 text-emerald-500" />
          Chhaya Workspace Ecosystem &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
