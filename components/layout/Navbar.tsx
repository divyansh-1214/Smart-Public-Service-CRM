"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  useUser,
  UserButton, 
  SignInButton, 
  SignUpButton 
} from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  Menu, 
  X, 
  ChevronRight,
  LayoutDashboard,
  Bell
} from "lucide-react";
import VapiButton from "@/components/crm/VapiButton";

const Navbar = () => {
  const pathname = usePathname();
  const { isSignedIn } = useUser();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isLandingPage = pathname === "/";

  const navLinks = [
    { label: "Features", href: "/#features", showOnLanding: true },
    { label: "Lifecycle", href: "/#lifecycle", showOnLanding: true },
    { label: "Security", href: "/#security", showOnLanding: true },
    { label: "Dashboard", href: "/dashboard", showInApp: true },
    { label: "Admin", href: "/admin", showInApp: true },
    { label: "Officer", href: "/worker", showInApp: true },
  ];

  const filteredLinks = navLinks.filter(link => {
    if (isLandingPage) return link.showOnLanding;
    return link.showInApp;
  });

  return (
    <>
      <nav 
        className={`fixed top-0 left-0 w-full z-[100] transition-all duration-500 ${
          isScrolled 
            ? "bg-white/80 backdrop-blur-xl border-b border-slate-100 py-3" 
            : "bg-transparent py-6"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="bg-slate-900 p-2 rounded-xl transition-transform group-hover:rotate-12">
                <Shield className="text-white w-6 h-6" />
              </div>
              <span className={`text-xl font-black tracking-tighter uppercase transition-colors ${
                isLandingPage && !isScrolled ? "text-slate-900" : "text-slate-900"
              }`}>
                PS-CRM
              </span>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-10">
              <div className="flex items-center gap-8 mr-4">
                {filteredLinks.map((link) => (
                  <Link 
                    key={link.label}
                    href={link.href} 
                    className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              <div className="h-6 w-px bg-slate-100 mx-2" />

              <div className="flex items-center gap-4">
                <VapiButton />
                {!isSignedIn && (
                  <>
                    <SignInButton mode="modal">
                      <button className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 hover:text-indigo-600 transition-colors">
                        Sign In
                      </button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <button className="bg-slate-900 text-white px-8 py-3 rounded-full text-[11px] font-black uppercase tracking-[0.2em] hover:bg-indigo-600 hover:shadow-xl hover:shadow-indigo-200 transition-all active:scale-95">
                        Get Started
                      </button>
                    </SignUpButton>
                  </>
                )}
                
                {isSignedIn && (
                  <>
                    <Link 
                      href="/notifications"
                      className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-slate-900 relative"
                    >
                      <Bell className="w-5 h-5" />
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
                    </Link>
                    <div className="flex items-center gap-3 pl-2">
                      <UserButton 
                        appearance={{
                          elements: {
                            avatarBox: "w-10 h-10 rounded-xl shadow-sm border border-slate-100"
                          }
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Mobile Toggle */}
            <div className="md:hidden flex items-center gap-4">
              <VapiButton />
              {isSignedIn && (
                <UserButton />
              )}
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                className="p-2 text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
              >
                {isMobileMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-[90] bg-white pt-24 px-6 md:hidden overflow-y-auto"
          >
            <div className="flex flex-col gap-8 pb-12">
              <div className="flex flex-col gap-4">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 ml-4 mb-2">Navigation</p>
                {filteredLinks.map((link) => (
                  <Link 
                    key={link.label}
                    href={link.href} 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-2xl font-black uppercase tracking-widest text-slate-900 hover:text-indigo-600 transition-colors p-4 rounded-3xl hover:bg-slate-50 flex items-center justify-between group"
                  >
                    {link.label}
                    <ChevronRight className="w-6 h-6 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all" />
                  </Link>
                ))}
              </div>

              <div className="h-px bg-slate-100 mx-4" />

              <div className="flex flex-col gap-4 px-4">
                {!isSignedIn && (
                  <>
                    <SignInButton mode="modal">
                      <button className="w-full py-5 text-sm font-black uppercase tracking-[0.2em] text-slate-900 border-2 border-slate-100 rounded-3xl hover:bg-slate-50 transition-all">
                        Sign In
                      </button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <button className="w-full py-5 text-sm font-black uppercase tracking-[0.2em] bg-slate-900 text-white rounded-3xl shadow-xl shadow-slate-100 hover:bg-indigo-600 transition-all">
                        Access Portal
                      </button>
                    </SignUpButton>
                  </>
                )}
                
                {isSignedIn && (
                  <Link 
                    href="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-4 p-5 bg-indigo-50 text-indigo-600 rounded-3xl font-black uppercase tracking-widest text-xs"
                  >
                    <LayoutDashboard className="w-5 h-5" />
                    Enter Dashboard
                  </Link>
                )}
              </div>

              <div className="mt-auto px-4 text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">
                  PS-CRM © 2026. Secure Portal.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
