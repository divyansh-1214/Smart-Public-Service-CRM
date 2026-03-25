import Link from "next/link";
import { Alata, Syne } from "next/font/google";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Clock3,
  MapPinned,
  ShieldCheck,
  Workflow,
} from "lucide-react";

const heading = Syne({
  subsets: ["latin"],
  variable: "--font-landing-heading",
});

const body = Alata({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-landing-body",
});

const pillars = [
  {
    title: "Civic Complaint Lifecycle",
    detail: "Track every grievance from submission to closure with full audit visibility.",
    icon: Workflow,
  },
  {
    title: "Department-Level Routing",
    detail: "Automatically route incidents to the right municipal department and officer.",
    icon: Building2,
  },
  {
    title: "Escalation with SLA",
    detail: "Auto-escalate delayed assignments and preserve accountability timelines.",
    icon: Clock3,
  },
];

export default function LandingPage() {
  return (
    <main
      className={`${heading.variable} ${body.variable} min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_8%_8%,#dcfce7_0,transparent_32%),radial-gradient(circle_at_85%_16%,#dbeafe_0,transparent_36%),radial-gradient(circle_at_52%_96%,#fee2e2_0,transparent_35%),#f8fafc] px-5 py-10 md:px-10`}
      style={{ fontFamily: "var(--font-landing-body)" }}
    >
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="relative overflow-hidden rounded-[2.25rem] border border-slate-200/80 bg-white/85 p-8 shadow-[0_32px_120px_-48px_rgba(15,23,42,0.55)] backdrop-blur-xl md:p-12">
          <div className="absolute -top-20 right-12 h-52 w-52 rounded-full bg-emerald-200/35 blur-3xl" />
          <div className="absolute -bottom-16 left-8 h-48 w-48 rounded-full bg-sky-200/40 blur-3xl" />

          <div className="relative z-10 grid grid-cols-1 gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-600">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Police & Public Services CRM
              </p>

              <h1
                className="mt-5 text-4xl leading-[1.04] text-slate-900 md:text-6xl"
                style={{ fontFamily: "var(--font-landing-heading)" }}
              >
                A modern command center for public grievance resolution.
              </h1>

              <p className="mt-5 max-w-2xl text-sm font-semibold leading-relaxed text-slate-600 md:text-base">
                PS-CRM connects citizens, officers, and administrators through one transparent operational workflow powered by Next.js, Prisma, and Clerk.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/sign-in"
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-black uppercase tracking-[0.12em] text-white transition-all hover:bg-slate-700"
                >
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-black uppercase tracking-[0.12em] text-slate-800 transition-all hover:bg-slate-50"
                >
                  Create Account
                </Link>

                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-6 py-3 text-sm font-black uppercase tracking-[0.12em] text-emerald-800 transition-all hover:bg-emerald-100"
                >
                  Open Admin
                </Link>
              </div>
            </div>

            <aside className="rounded-3xl border border-slate-200 bg-linear-to-br from-slate-900 to-slate-700 p-7 text-white shadow-xl">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-300">Platform Snapshot</p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-300">API Domains</p>
                  <p className="mt-2 text-2xl font-black">24+</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-300">Roles</p>
                  <p className="mt-2 text-2xl font-black">4</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-300">Audit</p>
                  <p className="mt-2 text-2xl font-black">Live</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-300">Escalation</p>
                  <p className="mt-2 text-2xl font-black">Auto</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 p-4">
                <p className="text-sm font-bold leading-relaxed text-emerald-100">
                  SLA checker runs in the background and escalates overdue assignments to higher-level officers.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {pillars.map((pillar) => (
            <article
              key={pillar.title}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.45)] transition-all hover:-translate-y-1"
            >
              <div className="inline-flex rounded-2xl bg-slate-100 p-3 text-slate-700">
                <pillar.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-xl font-black text-slate-900">{pillar.title}</h2>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">{pillar.detail}</p>
            </article>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-7">
            <h3 className="text-sm font-black uppercase tracking-[0.15em] text-slate-500">Service Flow</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <MapPinned className="h-5 w-5 text-sky-600" />
                <p className="mt-2 text-sm font-black text-slate-900">Citizens Report</p>
                <p className="mt-1 text-xs font-semibold text-slate-600">Capture location and issue context.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <BadgeCheck className="h-5 w-5 text-emerald-600" />
                <p className="mt-2 text-sm font-black text-slate-900">Teams Act</p>
                <p className="mt-1 text-xs font-semibold text-slate-600">Workers update progress with traceable logs.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <Clock3 className="h-5 w-5 text-amber-600" />
                <p className="mt-2 text-sm font-black text-slate-900">Managers Govern</p>
                <p className="mt-1 text-xs font-semibold text-slate-600">Escalate delays and enforce SLA targets.</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-linear-to-br from-amber-50 to-rose-50 p-7">
            <h3 className="text-sm font-black uppercase tracking-[0.15em] text-slate-600">Quick Navigation</h3>
            <div className="mt-4 space-y-2">
              <Link href="/worker/dashboard" className="block rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50">
                Worker Dashboard
              </Link>
              <Link href="/notifications" className="block rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50">
                Notifications
              </Link>
              <Link href="/feedback" className="block rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50">
                Service Feedback
              </Link>
              <Link href="/api/health" className="block rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50">
                API Health Check
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
