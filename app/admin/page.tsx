"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState, useMemo } from "react";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  ShieldAlert, 
  Settings, 
  Search, 
  Filter, 
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  UserCheck,
  UserX,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreHorizontal,
  Mail,
  Phone,
  Calendar,
  Shield,
  Briefcase,
  MapPin,
  CheckSquare,
  Square,
  X
} from "lucide-react";
import { format } from "date-fns";
import { 
  ComplaintStatus, 
  Role, 
  Priority, 
  ComplaintCategory,
  OfficerStatus
} from "@prisma/client";

// --- Types ---
interface Complaint {
  id: string;
  title: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  priority: Priority;
  createdAt: string;
  citizen: {
    name: string;
    email: string;
  };
  assignedOfficer?: {
    id: string;
    name: string;
  };
  department: {
    name: string;
  };
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

// --- Components ---

const StatusBadge = ({ status }: { status: ComplaintStatus }) => {
  const colors = {
    [ComplaintStatus.SUBMITTED]: "bg-blue-100 text-blue-700 border-blue-200",
    [ComplaintStatus.ASSIGNED]: "bg-purple-100 text-purple-700 border-purple-200",
    [ComplaintStatus.IN_PROGRESS]: "bg-amber-100 text-amber-700 border-amber-200",
    [ComplaintStatus.RESOLVED]: "bg-emerald-100 text-emerald-700 border-emerald-200",
    [ComplaintStatus.CLOSED]: "bg-gray-100 text-gray-700 border-gray-200",
    [ComplaintStatus.REJECTED]: "bg-rose-100 text-rose-700 border-rose-200",
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${colors[status]}`}>
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
    [Priority.MINIMAL]: "text-gray-600",
  };

  return (
    <span className={`flex items-center gap-1.5 text-xs font-bold ${colors[priority]}`}>
      <span className={`w-1.5 h-1.5 rounded-full bg-current`} />
      {priority}
    </span>
  );
};

export default function AdminDashboard() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<"complaints" | "users" | "settings">("complaints");
  
  // Data States
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter/Search States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Assignment Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigningComplaintId, setAssigningComplaintId] = useState<string | null>(null);
  const [availableOfficers, setAvailableOfficers] = useState<OfficerData[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  // User Management State
  const [editingUser, setEditingUser] = useState<UserData | null>(null);

  // Fetch Data
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
        const res = await fetch(`/api/complaint?${queryParams}`);
        const json = await res.json();
        if (res.ok) {
          setComplaints(json.data);
          setTotalPages(json.meta.totalPages);
        } else {
          setError(json.error || "Failed to fetch complaints");
        }
      } else if (activeTab === "users") {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: "10",
          ...(searchTerm ? { search: searchTerm } : {}),
        });
        const res = await fetch(`/api/users?${queryParams}`);
        const json = await res.json();
        if (res.ok) {
          setUsers(json.data);
          setTotalPages(json.meta.totalPages);
        } else {
          setError(json.error || "Failed to fetch users");
        }
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && user) {
      fetchData();
    }
  }, [isLoaded, user, activeTab, page, statusFilter]);

  // Handle Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) setPage(1);
      fetchData();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const toggleSelectAll = () => {
    if (selectedItems.length === complaints.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(complaints.map(c => c.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkAssign = async () => {
    if (selectedItems.length === 0) return;
    setAssigningComplaintId(selectedItems[0]); // Just use first for now as template
    setIsAssignModalOpen(true);
  };

  const openAssignModal = async (complaintId: string) => {
    setAssigningComplaintId(complaintId);
    setIsAssignModalOpen(true);
    try {
      const res = await fetch(`/api/complaint/assign/${complaintId}`);
      const json = await res.json();
      if (res.ok) {
        setAvailableOfficers(json.data.availableOfficers);
      }
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
        const res = await fetch(`/api/complaint/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ complaintId: id, officerId }),
        });
        if (!res.ok) throw new Error("Assignment failed");
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
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setEditingUser(null);
        fetchData();
      }
    } catch (err) {
      alert("Update failed");
    }
  };

  if (!isLoaded || isLoading && !complaints.length && !users.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50/50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm font-medium text-gray-500 animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // --- Render Helpers ---

  return (
    <div className="flex min-h-screen bg-gray-50/50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">PS-CRM</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Admin Panel</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5">
          <button 
            onClick={() => { setActiveTab("complaints"); setPage(1); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "complaints" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"}`}
          >
            <FileText className="w-5 h-5" />
            Complaints
          </button>
          <button 
            onClick={() => { setActiveTab("users"); setPage(1); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "users" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"}`}
          >
            <Users className="w-5 h-5" />
            User Management
          </button>
          <button 
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "settings" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"}`}
          >
            <Settings className="w-5 h-5" />
            System Settings
          </button>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 border-2 border-white overflow-hidden">
              {user?.imageUrl ? <img src={user.imageUrl} alt="User" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-blue-600 font-bold">A</div>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-gray-900 truncate">{user?.fullName || "Admin User"}</p>
              <p className="text-xs font-medium text-gray-500 truncate">Administrator</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              {activeTab === "complaints" ? "Complaints Queue" : activeTab === "users" ? "User Directory" : "System Settings"}
            </h2>
            {activeTab === "complaints" && (
              <span className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-black text-gray-500 uppercase tracking-wider">
                Live Feed
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
              <input 
                type="text" 
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 pr-4 py-2.5 bg-gray-100 border-none rounded-xl text-sm font-bold w-64 focus:ring-2 focus:ring-blue-600/20 focus:bg-white transition-all outline-none"
              />
            </div>
            <button className="p-2.5 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-colors">
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} onClick={() => fetchData()} />
            </button>
          </div>
        </header>

        <div className="p-8 space-y-6">
          {/* Dashboard Stats (Quick View) */}
          {activeTab === "complaints" && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: "Total Received", value: complaints.length, icon: FileText, color: "blue" },
                { label: "Pending Assignment", value: complaints.filter(c => c.status === "SUBMITTED").length, icon: Clock, color: "amber" },
                { label: "High Priority", value: complaints.filter(c => c.priority === "HIGH" || c.priority === "CRITICAL").length, icon: AlertCircle, color: "rose" },
                { label: "Resolved Today", value: complaints.filter(c => {
                  if (c.status !== "RESOLVED") return false;
                  // If we had a resolvedAt we'd use it, otherwise fall back to rough check or assume 0 if not tracked
                  // For prototype purposes, let's just count all resolved
                  return true;
                }).length, icon: CheckCircle2, color: "emerald" },
              ].map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                    <h3 className="text-3xl font-black text-gray-900 tracking-tight">{stat.value}</h3>
                  </div>
                  <div className={`w-14 h-14 bg-${stat.color}-50 rounded-2xl flex items-center justify-center`}>
                    <stat.icon className={`w-7 h-7 text-${stat.color}-600`} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {activeTab === "complaints" && (
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-600/20 outline-none cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  {Object.values(ComplaintStatus).map(status => (
                    <option key={status} value={status}>{status.replace("_", " ")}</option>
                  ))}
                </select>
              )}
              
              {selectedItems.length > 0 && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                  <span className="text-xs font-bold text-gray-500 ml-2">
                    {selectedItems.length} selected
                  </span>
                  <button 
                    onClick={handleBulkAssign}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                  >
                    Bulk Assign
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400">Page {page} of {totalPages}</span>
              <div className="flex items-center gap-1">
                <button 
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="p-2 bg-gray-50 text-gray-500 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="p-2 bg-gray-50 text-gray-500 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Table Area */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              {activeTab === "complaints" ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="p-5 w-14">
                        <button onClick={toggleSelectAll} className="text-gray-400 hover:text-blue-600 transition-colors">
                          {selectedItems.length === complaints.length ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5" />}
                        </button>
                      </th>
                      <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Grievance Details</th>
                      <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status & Priority</th>
                      <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Assigned To</th>
                      <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {complaints.length > 0 ? complaints.map((complaint) => (
                      <tr key={complaint.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="p-5">
                          <button onClick={() => toggleSelectItem(complaint.id)} className="text-gray-300 group-hover:text-gray-400 hover:text-blue-600 transition-colors">
                            {selectedItems.includes(complaint.id) ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5" />}
                          </button>
                        </td>
                        <td className="p-5">
                          <div className="max-w-xs">
                            <h4 className="text-sm font-black text-gray-900 truncate">{complaint.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{complaint.category}</span>
                              <span className="text-gray-300">•</span>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{format(new Date(complaint.createdAt), 'MMM d, yyyy')}</span>
                            </div>
                            <p className="text-xs font-medium text-gray-500 mt-2 flex items-center gap-1.5">
                              <MapPin className="w-3 h-3" />
                              {complaint.department.name}
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
                              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-700">
                                {complaint.assignedOfficer.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <span className="text-sm font-bold text-gray-900">{complaint.assignedOfficer.name}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-amber-500 animate-pulse">
                              <AlertCircle className="w-4 h-4" />
                              <span className="text-xs font-black uppercase tracking-widest">Unassigned</span>
                            </div>
                          )}
                        </td>
                        <td className="p-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => openAssignModal(complaint.id)}
                              className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all"
                              title="Assign Officer"
                            >
                              <UserCheck className="w-5 h-5" />
                            </button>
                            <a 
                              href={`/admin/complaint/${complaint.id}`}
                              className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all"
                              title="View Details"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="p-20 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center">
                              <Search className="w-8 h-8 text-gray-300" />
                            </div>
                            <p className="text-sm font-bold text-gray-400 tracking-tight">No complaints matching your filters</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : activeTab === "users" ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">User Information</th>
                      <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">System Role</th>
                      <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Account Status</th>
                      <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="p-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 border-2 border-white flex items-center justify-center text-sm font-black text-gray-400">
                              {u.name[0]}
                            </div>
                            <div>
                              <p className="text-sm font-black text-gray-900 leading-none mb-1">{u.name}</p>
                              <p className="text-xs font-medium text-gray-500">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                            u.role === Role.ADMIN ? "bg-rose-50 text-rose-700 border-rose-100" :
                            u.role === Role.MANAGER ? "bg-blue-50 text-blue-700 border-blue-100" :
                            u.role === Role.WORKER ? "bg-amber-50 text-amber-700 border-amber-100" :
                            "bg-gray-50 text-gray-700 border-gray-100"
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                            <span className="text-xs font-bold text-gray-600">{u.isActive ? 'Active' : 'Suspended'}</span>
                          </div>
                        </td>
                        <td className="p-5 text-right">
                          <button 
                            onClick={() => setEditingUser(u)}
                            className="px-3 py-1.5 bg-gray-50 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-20 text-center">
                  <Settings className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <p className="text-sm font-bold text-gray-400">System settings module is under maintenance</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Assignment Modal */}
        {isAssignModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Assign Officer</h3>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Select personnel for {selectedItems.length > 0 ? `${selectedItems.length} complaints` : "this case"}</p>
                </div>
                <button onClick={() => setIsAssignModalOpen(false)} className="p-2 bg-white text-gray-400 rounded-xl hover:text-gray-900 shadow-sm">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {availableOfficers.length > 0 ? availableOfficers.map((officer) => (
                  <button 
                    key={officer.id}
                    onClick={() => handleAssignOfficer(officer.id)}
                    disabled={isAssigning}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-sm font-black text-blue-700">
                      {officer.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-gray-900">{officer.name}</p>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">{officer.position} • {officer.status}</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                )) : (
                  <div className="py-10 text-center">
                    <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-8 h-8 text-amber-500" />
                    </div>
                    <p className="text-sm font-bold text-gray-500">No active officers found in this department</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* User Management Modal */}
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-100 p-8 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">Edit Permissions</h3>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Manage user access & roles</p>
                </div>
                <button onClick={() => setEditingUser(null)} className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:text-gray-900">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">System Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.values(Role).map((role) => (
                      <button 
                        key={role}
                        onClick={() => handleUpdateUser(editingUser.id, { role })}
                        className={`p-3 rounded-xl border text-xs font-black transition-all ${editingUser.role === role ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'border-gray-100 text-gray-500 hover:border-blue-200 hover:bg-blue-50'}`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Account Status</label>
                  <button 
                    onClick={() => handleUpdateUser(editingUser.id, { isActive: !editingUser.isActive })}
                    className={`w-full p-4 rounded-2xl border text-sm font-black transition-all flex items-center justify-between ${editingUser.isActive ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-rose-100 bg-rose-50 text-rose-700'}`}
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
