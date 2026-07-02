'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Compass, LayoutGrid, Users, ArrowRight, Library, ShieldAlert } from 'lucide-react';

export default function LandingPage() {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    // Get mouse positions relative to screen center
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
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center relative overflow-hidden font-sans select-none"
    >
      {/* 3D background grids and gradients */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/20 via-slate-950 to-slate-950"></div>
      
      {/* Dynamic Grid Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none z-0"
        style={{
          backgroundImage: 'radial-gradient(circle, #10b981 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      ></div>

      {/* Floating neon light orbs */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-emerald-500/5 blur-[120px] animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-teal-500/5 blur-[120px] animate-pulse pointer-events-none" style={{ animationDelay: '2s' }}></div>

      {/* Hero container applying 3D Parallax */}
      <div 
        className="z-10 max-w-5xl w-full px-6 flex flex-col lg:flex-row items-center justify-between gap-12 duration-200 ease-out"
        style={{
          transform: `perspective(1000px) rotateX(${-coords.y}deg) rotateY(${coords.x}deg)`,
        }}
      >
        {/* Left Side: Copy and Title */}
        <div className="flex-1 text-center lg:text-left space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold uppercase tracking-wider animate-bounce">
            <Library className="h-3.5 w-3.5" />
            CRM Console Mode
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Chhaya Library <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent drop-shadow-sm">
              Management
            </span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base max-w-md leading-relaxed">
            Configure seat matrices, track subscription renewals, view real-time occupancy metrics, and manage customer accounts from a high-fidelity visual interface.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
            <Link 
              href="/workspace"
              className="group relative px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition duration-300 flex items-center gap-2.5 overflow-hidden"
            >
              {/* Button shimmer reflection effect */}
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
              Go to Workspace
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1.5 transition-transform duration-300" />
            </Link>
          </div>
        </div>

        {/* Right Side: Interactive Floating 3D Seat Grid Component */}
        <div className="flex-1 flex items-center justify-center relative w-full max-w-[400px]">
          {/* Isometric container */}
          <div 
            className="w-72 h-72 relative"
            style={{
              perspective: '1200px',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Inner rotating grid */}
            <div 
              className="absolute inset-0 grid grid-cols-4 grid-rows-4 gap-4 animate-float"
              style={{
                transform: 'rotateX(60deg) rotateZ(-45deg)',
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Render 16 floating 3D seat cards */}
              {Array.from({ length: 16 }).map((_, i) => {
                // Color seats randomly to simulate a working environment (mostly green, some occupied red)
                const isOccupied = i % 5 === 1;
                const isMaintenance = i % 11 === 3;
                
                let bgClass = 'bg-emerald-500/25 border-emerald-500/40 shadow-emerald-500/10 text-emerald-400';
                if (isOccupied) {
                  bgClass = 'bg-rose-500/25 border-rose-500/40 shadow-rose-500/10 text-rose-400';
                } else if (isMaintenance) {
                  bgClass = 'bg-amber-500/25 border-amber-500/40 shadow-amber-500/10 text-amber-400';
                }

                return (
                  <div
                    key={i}
                    className={`border rounded-lg flex items-center justify-center text-[10px] font-bold shadow-lg transition-transform duration-500 ${bgClass}`}
                    style={{
                      transform: `translateZ(${i % 3 === 0 ? '12px' : '0px'})`,
                      transformStyle: 'preserve-3d',
                      animation: `pulse-seat 2s infinite ease-in-out`,
                      animationDelay: `${i * 100}ms`
                    }}
                  >
                    #{i + 1}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Global CSS for 3D Floating Animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: rotateX(60deg) rotateZ(-45deg) translateZ(0px);
          }
          50% {
            transform: rotateX(62deg) rotateZ(-43deg) translateZ(15px);
          }
        }
        .animate-float {
          animation: float 6s infinite ease-in-out;
          transform-style: preserve-3d;
        }
        @keyframes pulse-seat {
          0%, 100% {
            opacity: 0.8;
          }
          50% {
            opacity: 1;
            box-shadow: 0 0 12px currentColor;
          }
        }
      `}</style>
      
      {/* Subtle branding footer */}
      <footer className="absolute bottom-6 z-10 text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
        <Compass className="h-3 w-3 text-emerald-500" />
        Chhaya Workspace Ecosystem
      </footer>
    </div>
  );
}
