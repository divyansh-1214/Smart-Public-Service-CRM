"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Users, 
  BarChart3, 
  MessageSquare, 
  Cpu, 
  ArrowUpRight, 
  CheckCircle2, 
  Lock, 
  Smartphone, 
  Search, 
  Clock, 
  ChevronRight,
  Menu,
  X,
  Camera,
  MapPin,
  TrendingUp,
  Activity,
  AlertTriangle,
  FileText
} from 'lucide-react';

import { useUser } from "@clerk/nextjs";
import Link from 'next/link';

// --- Components ---

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-white">
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
        <Shield className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-indigo-600 animate-pulse" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-900">PS-CRM</p>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 animate-pulse">Initializing Secure Portal</p>
      </div>
    </div>
  </div>
);

const StatusBadge = ({ children, color }: { children: React.ReactNode, color: string }) => (
  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${color}`}>
    {children}
  </div>
);

const App = () => {
  const { user, isLoaded } = useUser();
  const [activeLifecycleStep, setActiveLifecycleStep] = useState(0);

  const lifecycleSteps = [
    { title: "Filed", desc: "Citizen submits grievance with precise location data.", icon: <MessageSquare className="w-5 h-5" /> },
    { title: "AI Triage", desc: "Neural engine predicts department and priority levels.", icon: <Cpu className="w-5 h-5" /> },
    { title: "Assigned", desc: "System auto-routes to the best available field officer.", icon: <Users className="w-5 h-5" /> },
    { title: "Escalated", desc: "SLA breaches trigger immediate superior notification.", icon: <ArrowUpRight className="w-5 h-5" /> },
    { title: "Evidence", desc: "Verification required via geo-tagged photo uploads.", icon: <Camera className="w-5 h-5" /> },
    { title: "Closed", desc: "Final resolution validated by citizen feedback loop.", icon: <CheckCircle2 className="w-5 h-5" /> },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveLifecycleStep((prev) => (prev + 1) % lifecycleSteps.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [lifecycleSteps.length]);

  if (!isLoaded) return <LoadingSpinner />;

  return (
    <AnimatePresence mode="wait">
      {user ? (
        <motion.div
          key="redirect"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-12 text-center"
        >
          <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl shadow-indigo-200">
            <Shield className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-4 uppercase">Welcome back, {user.firstName || "Citizen"}</h2>
          <p className="text-slate-500 text-lg font-medium mb-12 max-w-md">Your secure session is active. Redirecting you to your personalized command center.</p>
          <Link 
            href="/dashboard"
            className="bg-slate-900 text-white px-12 py-5 rounded-2xl text-sm font-black uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all flex items-center gap-3 shadow-2xl shadow-slate-200"
          >
            Enter Dashboard <ChevronRight className="w-5 h-5" />
          </Link>
        </motion.div>
      ) : (
        <motion.div 
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-screen bg-[#FDFDFD] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden"
        >
          {/* Navigation */}
          {/* Hero Section */}
      <header className="relative pt-28 pb-16 sm:pt-36 sm:pb-24 lg:pt-52 lg:pb-48 overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 relative z-10">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 xl:gap-24 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-2xl"
            >
              <div className="inline-flex items-center gap-2 md:gap-3 px-3 md:px-4 py-1.5 rounded-full bg-slate-50 border border-slate-100 mb-6 md:mb-8">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40"></div>
                </div>
                <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Operational Excellence v2.0</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[78px] font-black text-slate-900 leading-[0.95] tracking-tighter mb-6 md:mb-8">
                Government Services, <br />
                <span className="bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">Reimagined.</span>
              </h1>
              
              <p className="text-base md:text-xl text-slate-500 mb-8 md:mb-12 leading-relaxed font-medium max-w-lg">
                PS-CRM unifies intake, AI-assisted routing, and SLA escalation into one accountable, real-time command center for modern cities.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 md:gap-6">
                <button className="group relative bg-slate-900 text-white px-8 md:px-10 py-4 md:py-5 rounded-2xl text-sm font-black uppercase tracking-[0.2em] overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-slate-200">
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    Officials Dashboard <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-indigo-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
                </button>
                <button className="bg-white text-slate-900 border-2 border-slate-100 px-8 md:px-10 py-4 md:py-5 rounded-2xl text-sm font-black uppercase tracking-[0.2em] hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-center gap-2">
                  Public Portal
                </button>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="mt-12 md:mt-16 lg:mt-0 relative pb-12 lg:pb-0"
            >
              <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden relative group">
                <div className="bg-slate-50/50 backdrop-blur-md border-b border-slate-100 p-4 md:p-6 flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                  </div>
                  <div className="text-[9px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest hidden sm:block">command-center.ps-crm.gov</div>
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-500" />
                  </div>
                </div>
                
                <div className="p-4 sm:p-6 md:p-8 space-y-4 md:space-y-8">
                  <div className="grid grid-cols-3 gap-2 md:gap-6">
                    {[
                      { label: "Active", val: "1,284", color: "text-indigo-600" },
                      { label: "Resolved", val: "432", color: "text-emerald-500" },
                      { label: "Breached", val: "12", color: "text-rose-500" },
                    ].map((stat, i) => (
                      <div key={i} className="bg-slate-50/50 p-3 md:p-5 rounded-xl md:rounded-2xl border border-slate-100/50">
                        <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 md:mb-2">{stat.label}</p>
                        <p className={`text-lg md:text-2xl font-black tracking-tight ${stat.color}`}>{stat.val}</p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="relative h-44 sm:h-56 md:h-72 bg-slate-50 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden border border-slate-100 flex items-center justify-center">
                    <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px'}}></div>
                    <motion.div 
                      animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.3, 0.2] }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="absolute top-1/4 left-1/3 w-32 h-32 md:w-40 md:h-40 bg-indigo-400 rounded-full blur-[60px] md:blur-[80px]"
                    />
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                      transition={{ duration: 6, repeat: Infinity, delay: 1 }}
                      className="absolute bottom-1/4 right-1/4 w-40 h-40 md:w-52 md:h-52 bg-rose-400 rounded-full blur-[80px] md:blur-[100px]"
                    />
                    <div className="relative z-10 flex flex-col items-center gap-3 md:gap-4">
                      <div className="flex -space-x-2 md:-space-x-3">
                        {[1,2,3,4].map(i => (
                          <div key={i} className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white border-2 border-slate-50 shadow-sm flex items-center justify-center">
                            <Users className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" />
                          </div>
                        ))}
                      </div>
                      <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Real-time Officer Dispatch</p>
                    </div>
                    
                    <div className="absolute top-8 right-8 md:top-12 md:right-12"><MapPin className="text-rose-500 w-5 h-5 md:w-6 md:h-6 drop-shadow-xl" /></div>
                    <div className="absolute bottom-10 left-10 md:bottom-16 md:left-16"><MapPin className="text-indigo-500 w-5 h-5 md:w-6 md:h-6 drop-shadow-xl" /></div>
                  </div>
                </div>
              </div>
              
              {/* Floating Alert - hidden on very small screens */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-4 -left-4 sm:-bottom-8 sm:-left-8 bg-white p-3 sm:p-5 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 flex items-center gap-3 sm:gap-5"
              >
                <div className="bg-emerald-50 p-2 sm:p-3 rounded-xl sm:rounded-2xl">
                  <CheckCircle2 className="text-emerald-500 w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <div className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5 sm:mb-1">Resolution Verified</div>
                  <div className="text-xs sm:text-sm font-black text-slate-900">Geo-tagged Proof Active</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
        
        {/* Abstract Background Element */}
        <div className="absolute top-0 right-0 w-[600px] lg:w-[800px] h-[600px] lg:h-[800px] bg-slate-50 rounded-full blur-[120px] -mr-72 lg:-mr-96 -mt-72 lg:-mt-96 opacity-50"></div>
      </header>

      {/* Value Proposition */}
      <section className="py-16 md:py-24 lg:py-32 bg-slate-900 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
          <div className="grid md:grid-cols-2 gap-12 md:gap-24 items-end mb-12 md:mb-24">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-5xl lg:text-7xl font-black leading-[0.9] tracking-tighter"
            >
              BUILT FOR <br /> 
              <span className="text-indigo-400">ACCOUNTABILITY.</span>
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-lg text-slate-400 font-medium leading-relaxed max-w-md"
            >
              Public services shouldn't be a black box. We provide the transparency citizens deserve and the tools officers need.
            </motion.p>
          </div>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-12">
            {[
              { title: "Department Ownership", desc: "Every grievance is mapped to a department with fixed accountability chains.", icon: <Building2 className="w-8 h-8" /> },
              { title: "SLA Enforcement", desc: "Automatic escalation levels (1-5) ensure that critical issues never stagnate.", icon: <Activity className="w-8 h-8" /> },
              { title: "Verification Loop", desc: "Closure requires verifiable evidence and citizen-validated service quality.", icon: <CheckCircle2 className="w-8 h-8" /> }
            ].map((prop, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="group bg-white/5 p-10 rounded-[2.5rem] border border-white/10 hover:bg-white/10 transition-all hover:-translate-y-2"
              >
                <div className="bg-indigo-500/20 p-4 rounded-2xl w-fit mb-8 group-hover:scale-110 transition-transform">
                  {React.cloneElement(prop.icon as React.ReactElement<{ className?: string }>, { className: "w-8 h-8 text-indigo-400" })}
                </div>
                <h3 className="text-2xl font-black tracking-tight mb-4 uppercase">{prop.title}</h3>
                <p className="text-slate-400 leading-relaxed font-medium">{prop.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Lifecycle */}
      <section id="lifecycle" className="py-16 md:py-24 lg:py-32 bg-white relative">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-12 md:mb-24">
            <h2 className="text-3xl md:text-4xl lg:text-6xl font-black text-slate-900 tracking-tighter mb-4 md:mb-6 uppercase">The Digital Pipeline</h2>
            <p className="text-slate-500 text-base md:text-lg font-medium">From initial report to verified resolution, our system handles the complexity of public service workflows.</p>
          </div>
          
          {/* Mobile: horizontal scroll; Desktop: 6-col grid */}
          <div className="overflow-x-auto pb-4 -mx-5 px-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0 lg:overflow-visible">
          <div className="flex lg:grid lg:grid-cols-6 gap-4 relative min-w-max lg:min-w-0">
            {/* Background Line */}
            <div className="absolute top-10 left-0 w-full h-px bg-slate-100 hidden lg:block" />
            
            {lifecycleSteps.map((step, idx) => (
              <div 
                key={idx} 
                className={`relative z-10 flex flex-col items-center text-center p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] transition-all duration-500 w-44 md:w-auto ${
                  idx === activeLifecycleStep ? "bg-slate-50 shadow-xl shadow-slate-100 scale-105" : "opacity-40 grayscale"
                }`}
              >
                <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-4 md:mb-8 border-4 transition-all duration-500 ${
                  idx === activeLifecycleStep ? "bg-indigo-600 border-indigo-100 text-white shadow-2xl shadow-indigo-200" : "bg-white border-slate-100 text-slate-300"
                }`}>
                  {step.icon}
                </div>
                <h4 className="font-black text-xs md:text-sm uppercase tracking-[0.2em] mb-2 md:mb-3 text-slate-900">{step.title}</h4>
                <p className="text-xs font-medium text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="mt-12 md:mt-24 bg-indigo-50/50 rounded-2xl md:rounded-[3rem] p-6 sm:p-10 md:p-16 border border-indigo-100 flex flex-col md:flex-row items-center gap-6 md:gap-12"
          >
            <div className="bg-indigo-600 p-4 md:p-6 rounded-2xl md:rounded-[2rem] text-white shadow-2xl shadow-indigo-200 shrink-0">
              <Shield className="w-8 h-8 md:w-12 md:h-12" />
            </div>
            <div className="space-y-3 md:space-y-4">
              <h3 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">Verified Resolution Engine</h3>
              <p className="text-slate-600 text-base md:text-lg font-medium leading-relaxed max-w-3xl">
                Unlike traditional systems, PS-CRM requires multi-modal proof of completion. Every resolution event is anchored by geo-tagged media and validated through a mandatory citizen feedback window.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-16 md:py-24 lg:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
          <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
            <div className="max-w-xl">
              <h2 className="text-4xl lg:text-6xl font-black text-slate-900 tracking-tighter mb-6 uppercase">System Modules</h2>
              <p className="text-slate-500 text-lg font-medium">Interconnected logic engines that power city-scale operations.</p>
            </div>
            <button className="text-indigo-600 text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3 hover:gap-5 transition-all">
              Technical Documentation <ArrowUpRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: "Intake + AI", desc: "Citizen complaint creation with real-time neural mapping.", icon: <Smartphone className="text-indigo-600" /> },
              { title: "Assignment", desc: "Dynamic officer dispatch based on workload and proximity.", icon: <Cpu className="text-purple-600" /> },
              { title: "Escalation", desc: "Predictive engine that identifies potential SLA breaches.", icon: <AlertTriangle className="text-rose-600" /> },
              { title: "Governance", desc: "Audit logs and read-tracked notifications for compliance.", icon: <Lock className="text-emerald-600" /> }
            ].map((f, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -10 }}
                className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200 transition-all group"
              >
                <div className="p-4 bg-slate-50 rounded-2xl w-fit mb-8 group-hover:bg-indigo-50 transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-4 uppercase tracking-tight">{f.title}</h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section id="security" className="py-32 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="bg-slate-900 rounded-[4rem] p-12 lg:p-24 relative overflow-hidden">
            <div className="relative z-10 grid lg:grid-cols-2 gap-24 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-4xl lg:text-6xl font-black text-white mb-8 leading-tight tracking-tighter uppercase">Infrastructure <br /> of Trust.</h2>
                <p className="text-slate-400 text-xl mb-12 leading-relaxed font-medium">
                  Every action, assignment, and escalation is immutable. From Clerk-backed identity to multi-level audit trails, we ensure absolute integrity.
                </p>
                <div className="space-y-6">
                  {[
                    "Role-based operational access control",
                    "Geo-fenced resolution verification",
                    "Immutable audit-trail logging"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4 text-white/80 font-bold uppercase text-[10px] tracking-[0.2em]">
                      <div className="bg-indigo-500 p-1.5 rounded-full shadow-lg shadow-indigo-500/40">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-white/5 backdrop-blur-2xl rounded-[3rem] p-12 border border-white/10"
              >
                <div className="flex items-center gap-5 mb-10">
                  <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-2xl shadow-indigo-500/20">PS</div>
                  <div>
                    <div className="text-white font-black uppercase tracking-widest text-sm">Strategic Board</div>
                    <div className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em]">Public Service Commission</div>
                  </div>
                </div>
                <p className="text-white text-2xl font-light italic leading-relaxed">
                  "The transformation has been radical. We no longer ask 'what happened'—the audit logs tell the story of resolution in real-time."
                </p>
              </motion.div>
            </div>
            
            {/* Background Orbs */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600 rounded-full blur-[150px] opacity-20 -mr-64 -mt-64 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-rose-600 rounded-full blur-[120px] opacity-10 -ml-48 -mb-48"></div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white pt-32 pb-16 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid md:grid-cols-4 gap-24 mb-24">
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-10">
                <div className="bg-slate-900 p-2 rounded-xl">
                  <Shield className="text-white w-6 h-6" />
                </div>
                <span className="text-2xl font-black tracking-tighter text-slate-900 uppercase">PS-CRM</span>
              </div>
              <h3 className="text-4xl font-black tracking-tighter text-slate-900 mb-10 max-w-sm uppercase leading-[0.9]">
                Redefining Public <br /> <span className="text-indigo-600">Service.</span>
              </h3>
              <div className="flex gap-8">
                {["LinkedIn", "Twitter", "GitHub"].map(s => (
                  <a key={s} href="#" className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-900 transition-colors">{s}</a>
                ))}
              </div>
            </div>
            
            {["Product", "Company"].map((title, i) => (
              <div key={i}>
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-8">{title}</h4>
                <ul className="space-y-4">
                  {["Overview", "Features", "Security", "Case Studies"].map(item => (
                    <li key={item}>
                      <a href="#" className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-colors">{item}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="pt-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
              © {new Date().getFullYear()} PS-CRM GOVERNMENT SERVICES. GLOBAL DEPLOYMENT.
            </p>
            <div className="flex gap-10">
              <a href="#" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 hover:text-slate-900 transition-colors">Privacy</a>
              <a href="#" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 hover:text-slate-900 transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// --- Mock Components for context ---
const Building2 = ({ className }: { className?: string }) => <Shield className={className} />;

export default App;
