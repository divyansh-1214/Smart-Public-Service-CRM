"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { 
  FileText, 
  Users, 
  Settings, 
  Search, 
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  MapPin,
  CheckSquare,
  Square,
  X,
  Menu,
  ShieldAlert,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import axios from "axios";
import { 
  ComplaintStatus, 
  Role, 
  Priority, 
  ComplaintCategory,
  OfficerStatus
} from "@prisma/client";

interface Complaint {
  id: string;
  title: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  priority: Priority;
  createdAt: string;
  citizen: { name: string; email: string; };
  assignedOfficer?: { id: string; name: string; };
  department: { name: string; };
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

interface OfficerData {
  id: string;
  name: string;
  email: string;
  position: string;
  status: OfficerStatus;
  departmentId: string;
}

const StatusBadge = ({ status }: { status: ComplaintStatus }) => {
  const colors = {
    [ComplaintStatus.SUBMITTED]: "bg-blue-50 text-blue-700 border-blue-100",
    [ComplaintStatus.ASSIGNED]: "bg-purple-50 text-purple-700 border-purple-100",
    [ComplaintStatus.IN_PROGRESS]: "bg-amber-50 text-amber-700 border-amber-100",
    [ComplaintStatus.RESOLVED]: "bg-emerald-50 text-emerald-700 border-emerald-100",
    [ComplaintStatus.CLOSED]: "bg-slate-50 text-slate-700 border-slate-100",
    [ComplaintStatus.REJECTED]: "bg-rose-50 text-rose-700 border-rose-100",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${colors[status]}`}>
      {status.replace("_", " ")}
    </span>
  );
};

const PriorityBadge = ({ priority }: { priority: Priority }) => {
  const colors = {
    [Priority.CRITICAL]: "text-rose-600",
    [Priority.HIGH]: "text-orange-600",
    [Priority.MEDIUM]: "text-amber-600",
    [Priority.LOW]: "text-blue-600",
    [Priority.MINIMAL]: "text-slate-500",
  };
  return (
    <span className={`flex items-center gap-1.5 text-xs font-black ${colors[priority]}`}>
      <span className={`w-1.5 h-1.5 rounded-full bg-current`} />
      {priority}
    </span>
  );
};

export default function AdminDashboard() {
  const { user, isLoaded } = useUser();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"complaints" | "users" | "settings">("complaints");
  
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigningComplaintId, setAssigningComplaintId] = useState<string | null>(null);
  const [availableOfficers, setAvailableOfficers] = useState<OfficerData[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  const [editingUser, setEditingUser] = useState<UserData | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (activeTab === "complaints") {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: "10",
          ...(searchTerm ? { search: searchTerm } : {}),
          ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
        });
        const res = await axios.get(`/api/complaint?${queryParams}`);
        setComplaints(res.data?.data ?? []);
        setTotalPages(res.data?.meta?.totalPages ?? 1);
      } else if (activeTab === "users") {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: "10",
          ...(searchTerm ? { search: searchTerm } : {}),
        });
        const res = await axios.get(`/api/users?${queryParams}`);
        setUsers(res.data?.data ?? []);
        setTotalPages(res.data?.meta?.totalPages ?? 1);
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && user) fetchData();
  }, [isLoaded, user, activeTab, page, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) setPage(1);
      fetchData();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const toggleSelectAll = () => {
    if (selectedItems.length === complaints.length) setSelectedItems([]);
    else setSelectedItems(complaints.map(c => c.id));
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const openAssignModal = async (complaintId: string) => {
    setAssigningComplaintId(complaintId);
    setIsAssignModalOpen(true);
    try {
      const res = await axios.get(`/api/complaint/assign/${complaintId}`);
      setAvailableOfficers(res.data?.data?.availableOfficers ?? []);
    } catch (err) {
      console.error("Failed to fetch officers", err);
    }
  };

  const handleAssignOfficer = async (officerId: string) => {
    if (!assigningComplaintId) return;
    setIsAssigning(true);
    try {
      const targets = selectedItems.length > 0 ? selectedItems : [assigningComplaintId];
      for (const id of targets) {
        await axios.post(`/api/complaint/assign`, { complaintId: id, officerId });
      }
      setIsAssignModalOpen(false);
      setAssigningComplaintId(null);
      setSelectedItems([]);
      fetchData();
    } catch (err) {
      alert("Assignment failed");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUpdateUser = async (userId: string, data: Partial<UserData>) => {
    try {
      await axios.patch(`/api/users/${userId}`, data);
      setEditingUser(null);
      fetchData();
    } catch (err) {
      alert("Update failed");
    }
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setPage(1);
    setIsSidebarOpen(false);
  };

  if (!isLoaded || (isLoading && !complaints.length && !users.length)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-500 animate-pulse">Loading Admin Panel...</p>
        </div>
      </div>
    );
  }

  const tabTitle = activeTab === "complaints" ? "Complaints Queue" : activeTab === "users" ? "User Directory" : "System Settings";

  const navItems = [
    { id: "complaints", label: "Complaints", icon: FileText },
    { id: "users", label: "User Management", icon: Users },
    { id: "settings", label: "System Settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50/50 relative">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 md:hidden animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 md:relative md:z-auto
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        w-64 bg-white border-r border-slate-100
        transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
        flex flex-col sticky top-0 h-screen shadow-xl md:shadow-none
      `}>
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tighter leading-none">PS-CRM</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Admin Panel</p>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="ml-auto md:hidden p-1.5 hover:bg-slate-50 rounded-xl text-slate-400 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1.5">
          {navItems.map((item, idx) => (
            <button 
              key={item.id}
              onClick={() => handleTabChange(item.id as any)}
              style={{ animationDelay: `${idx * 60}ms` }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all animate-slide-in-left group
                ${activeTab === item.id 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
            >
              <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${activeTab === item.id ? "text-white" : ""}`} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-100 border-2 border-white overflow-hidden shrink-0">
              {user?.imageUrl 
                ? <img src={user.imageUrl} alt="User" className="w-full h-full object-cover" /> 
                : <div className="w-full h-full flex items-center justify-center text-indigo-600 font-black text-sm">A</div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-slate-900 truncate">{user?.fullName || "Admin User"}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Administrator</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 md:h-20 bg-white border-b border-slate-100 px-4 md:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3 md:gap-4">
            {/* Mobile menu button */}
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-colors md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg md:text-2xl font-black text-slate-900 tracking-tight">{tabTitle}</h2>
              {activeTab === "complaints" && (
                <span className="hidden md:inline-flex px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[9px] font-black uppercase tracking-wider">
                  Live Feed
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="relative group hidden sm:block">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <input 
                type="text" 
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium w-48 lg:w-64 focus:ring-2 focus:ring-indigo-600/15 focus:bg-white transition-all outline-none"
              />
            </div>
            <button 
              className="p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-colors"
              onClick={() => fetchData()}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>
        </header>

        <div className="p-4 md:p-8 space-y-4 md:space-y-6">
          {/* Stats */}
          {activeTab === "complaints" && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
              {[
                { label: "Total", value: complaints.length, icon: FileText, color: "indigo" },
                { label: "Pending", value: complaints.filter(c => c.status === "SUBMITTED").length, icon: Clock, color: "amber" },
                { label: "High Priority", value: complaints.filter(c => c.priority === "HIGH" || c.priority === "CRITICAL").length, icon: AlertCircle, color: "rose" },
                { label: "Resolved", value: complaints.filter(c => c.status === "RESOLVED").length, icon: CheckCircle2, color: "emerald" },
              ].map((stat, i) => (
                <div
                  key={i}
                  style={{ animationDelay: `${i * 80}ms` }}
                  className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between animate-fade-up hover:shadow-lg transition-shadow"
                >
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{stat.value}</h3>
                  </div>
                  <div className={`w-10 h-10 md:w-14 md:h-14 bg-${stat.color}-50 rounded-xl md:rounded-2xl flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 md:w-7 md:h-7 text-${stat.color}-600`} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="bg-white p-3 md:p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {activeTab === "complaints" && (
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="pl-8 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-600/15 outline-none cursor-pointer"
                  >
                    <option value="ALL">All Statuses</option>
                    {Object.values(ComplaintStatus).map(status => (
                      <option key={status} value={status}>{status.replace("_", " ")}</option>
                    ))}
                  </select>
                </div>
              )}
              {selectedItems.length > 0 && (
                <div className="flex items-center gap-2 animate-fade-in">
                  <span className="text-xs font-bold text-slate-500">{selectedItems.length} selected</span>
                  <button 
                    onClick={() => { setAssigningComplaintId(selectedItems[0]); setIsAssignModalOpen(true); }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                  >
                    Bulk Assign
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Page {page} of {totalPages}</span>
              <div className="flex items-center gap-1">
                <button 
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="p-2 bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="p-2 bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Table / Cards */}
          <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-fade-up">
            {activeTab === "complaints" ? (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="p-5 w-14">
                          <button onClick={toggleSelectAll} className="text-slate-400 hover:text-indigo-600 transition-colors">
                            {selectedItems.length === complaints.length && complaints.length > 0 
                              ? <CheckSquare className="w-5 h-5 text-indigo-600" /> 
                              : <Square className="w-5 h-5" />}
                          </button>
                        </th>
                        {["Grievance Details", "Status & Priority", "Assigned To", "Actions"].map(h => (
                          <th key={h} className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest last:text-right">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {complaints.length > 0 ? complaints.map((complaint, idx) => (
                        <tr 
                          key={complaint.id} 
                          style={{ animationDelay: `${idx * 40}ms` }}
                          className="hover:bg-slate-50/50 transition-colors group animate-fade-up"
                        >
                          <td className="p-5">
                            <button onClick={() => toggleSelectItem(complaint.id)} className="text-slate-300 group-hover:text-slate-400 hover:text-indigo-600 transition-colors">
                              {selectedItems.includes(complaint.id) 
                                ? <CheckSquare className="w-5 h-5 text-indigo-600" /> 
                                : <Square className="w-5 h-5" />}
                            </button>
                          </td>
                          <td className="p-5">
                            <div className="max-w-xs">
                              <h4 className="text-sm font-black text-slate-900 truncate">{complaint.title}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{complaint.category}</span>
                                <span className="text-slate-300">•</span>
                                <span className="text-[10px] font-bold text-slate-400">{format(new Date(complaint.createdAt), 'MMM d, yyyy')}</span>
                              </div>
                              <p className="text-xs font-medium text-slate-500 mt-1.5 flex items-center gap-1.5">
                                <MapPin className="w-3 h-3" />{complaint.department.name}
                              </p>
                            </div>
                          </td>
                          <td className="p-5 space-y-2">
                            <StatusBadge status={complaint.status} />
                            <PriorityBadge priority={complaint.priority} />
                          </td>
                          <td className="p-5">
                            {complaint.assignedOfficer ? (
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-[10px] font-black text-indigo-700">
                                  {complaint.assignedOfficer.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <span className="text-sm font-bold text-slate-900">{complaint.assignedOfficer.name}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-amber-500">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-xs font-black uppercase tracking-widest">Unassigned</span>
                              </div>
                            )}
                          </td>
                          <td className="p-5">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => openAssignModal(complaint.id)}
                                className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                                title="Assign Officer"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                              <a 
                                href={`/admin/complaint/${complaint.id}`}
                                className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                                title="View Details"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={5} className="p-16 text-center">
                            <div className="flex flex-col items-center gap-4 animate-fade-up">
                              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center">
                                <Search className="w-8 h-8 text-slate-200" />
                              </div>
                              <p className="text-sm font-bold text-slate-400">No complaints matching your filters</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card Layout */}
                <div className="md:hidden divide-y divide-slate-50">
                  {complaints.length > 0 ? complaints.map((complaint, idx) => (
                    <div 
                      key={complaint.id}
                      style={{ animationDelay: `${idx * 40}ms` }}
                      className="p-4 space-y-3 animate-fade-up"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <button onClick={() => toggleSelectItem(complaint.id)} className="text-slate-300 hover:text-indigo-600 transition-colors shrink-0">
                            {selectedItems.includes(complaint.id) 
                              ? <CheckSquare className="w-4 h-4 text-indigo-600" /> 
                              : <Square className="w-4 h-4" />}
                          </button>
                          <div className="min-w-0">
                            <h4 className="text-sm font-black text-slate-900 truncate">{complaint.title}</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{complaint.category}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button 
                            onClick={() => openAssignModal(complaint.id)}
                            className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                          <a 
                            href={`/admin/complaint/${complaint.id}`}
                            className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pl-7">
                        <StatusBadge status={complaint.status} />
                        <PriorityBadge priority={complaint.priority} />
                        <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{complaint.department.name}
                        </span>
                      </div>
                      {complaint.assignedOfficer ? (
                        <div className="flex items-center gap-2 pl-7">
                          <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-[9px] font-black text-indigo-700">
                            {complaint.assignedOfficer.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="text-xs font-bold text-slate-700">{complaint.assignedOfficer.name}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-amber-500 pl-7">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Unassigned</span>
                        </div>
                      )}
                    </div>
                  )) : (
                    <div className="p-12 text-center animate-fade-up">
                      <Search className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-sm font-bold text-slate-400">No complaints matching your filters</p>
                    </div>
                  )}
                </div>
              </>
            ) : activeTab === "users" ? (
              <>
                {/* Desktop Users Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        {["User Information", "System Role", "Account Status", "Actions"].map(h => (
                          <th key={h} className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest last:text-right">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {users.map((u, idx) => (
                        <tr 
                          key={u.id}
                          style={{ animationDelay: `${idx * 40}ms` }}
                          className="hover:bg-slate-50/50 transition-colors group animate-fade-up"
                        >
                          <td className="p-5">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 border-2 border-white flex items-center justify-center text-sm font-black text-slate-500">
                                {u.name[0]}
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-900">{u.name}</p>
                                <p className="text-xs font-medium text-slate-500">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                              u.role === Role.ADMIN ? "bg-rose-50 text-rose-700 border-rose-100" :
                              u.role === Role.MANAGER ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                              u.role === Role.WORKER ? "bg-amber-50 text-amber-700 border-amber-100" :
                              "bg-slate-50 text-slate-700 border-slate-100"
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="p-5">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                              <span className="text-xs font-bold text-slate-600">{u.isActive ? 'Active' : 'Suspended'}</span>
                            </div>
                          </td>
                          <td className="p-5 text-right">
                            <button 
                              onClick={() => setEditingUser(u)}
                              className="px-3 py-1.5 bg-slate-50 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile Users Cards */}
                <div className="md:hidden divide-y divide-slate-50">
                  {users.map((u, idx) => (
                    <div 
                      key={u.id}
                      style={{ animationDelay: `${idx * 40}ms` }}
                      className="p-4 flex items-center justify-between gap-3 animate-fade-up"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-sm font-black text-slate-500 shrink-0">
                          {u.name[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900 truncate">{u.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                              u.role === Role.ADMIN ? "bg-rose-50 text-rose-700" : 
                              u.role === Role.WORKER ? "bg-amber-50 text-amber-700" : "bg-indigo-50 text-indigo-700"
                            }`}>{u.role}</span>
                            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                              <div className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                              {u.isActive ? 'Active' : 'Suspended'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setEditingUser(u)}
                        className="shrink-0 px-3 py-1.5 bg-slate-50 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all"
                      >
                        Manage
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="p-16 text-center animate-fade-up">
                <Settings className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-sm font-bold text-slate-400">System settings module is under maintenance</p>
              </div>
            )}
          </div>
        </div>

        {/* Assignment Modal */}
        {isAssignModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-scale-in">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Assign Officer</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                    Select personnel for {selectedItems.length > 0 ? `${selectedItems.length} complaints` : "this case"}
                  </p>
                </div>
                <button onClick={() => setIsAssignModalOpen(false)} className="p-2 bg-white text-slate-400 rounded-xl hover:text-slate-900 shadow-sm hover:shadow-md transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {availableOfficers.length > 0 ? availableOfficers.map((officer, idx) => (
                  <button 
                    key={officer.id}
                    onClick={() => handleAssignOfficer(officer.id)}
                    disabled={isAssigning}
                    style={{ animationDelay: `${idx * 60}ms` }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all text-left group animate-fade-up"
                  >
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-sm font-black text-indigo-700 shrink-0">
                      {officer.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-900">{officer.name}</p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">{officer.position} • {officer.status}</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                )) : (
                  <div className="py-12 text-center animate-fade-up">
                    <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-8 h-8 text-amber-500" />
                    </div>
                    <p className="text-sm font-bold text-slate-500">No active officers found in this department</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* User Management Modal */}
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100 p-6 md:p-8 space-y-6 md:space-y-8 animate-scale-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Edit Permissions</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Manage user access & roles</p>
                </div>
                <button onClick={() => setEditingUser(null)} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-slate-900 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">System Role</label>
                  <div className="grid grid-cols-2 gap-2 md:gap-3">
                    {Object.values(Role).map((role) => (
                      <button 
                        key={role}
                        onClick={() => handleUpdateUser(editingUser.id, { role })}
                        className={`p-3 rounded-xl border text-xs font-black transition-all hover:scale-105 active:scale-95 ${
                          editingUser.role === role 
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                            : 'border-slate-100 text-slate-500 hover:border-indigo-200 hover:bg-indigo-50'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Account Status</label>
                  <button 
                    onClick={() => handleUpdateUser(editingUser.id, { isActive: !editingUser.isActive })}
                    className={`w-full p-4 rounded-2xl border text-sm font-black transition-all flex items-center justify-between hover:scale-[1.01] active:scale-[0.99] ${
                      editingUser.isActive 
                        ? 'border-emerald-100 bg-emerald-50 text-emerald-700' 
                        : 'border-rose-100 bg-rose-50 text-rose-700'
                    }`}
                  >
                    <span>{editingUser.isActive ? 'Deactivate Account' : 'Activate Account'}</span>
                    {editingUser.isActive ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
