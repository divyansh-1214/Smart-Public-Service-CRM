"use client";

import { useEffect, useState } from "react";
import { 
  Building2, 
  Plus, 
  Search, 
  MapPin, 
  Edit2, 
  Trash2, 
  ChevronRight,
  ArrowLeft,
  Loader2,
  X,
  AlertCircle
} from "lucide-react";
import axios from "axios";

export default function DepartmentsAdminPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<any>(null);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pincode, setPincode] = useState("");

  useEffect(() => {
    fetchDepartments();
  }, []);

  async function fetchDepartments() {
    try {
      setLoading(true);
      const res = await axios.get("/api/department");
      setDepartments(res.data?.data ?? []);
    } catch (error) {
      console.error("Error fetching departments:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingDept ? "PATCH" : "POST";
    const url = editingDept ? `/api/department/${editingDept.id}` : "/api/department";

    try {
      if (method === "PATCH") {
        await axios.patch(url, { name, description, pincode });
      } else {
        await axios.post(url, { name, description, pincode });
      }

      setIsModalOpen(false);
      setEditingDept(null);
      resetForm();
      fetchDepartments();
    } catch (error) {
      console.error("Error saving department:", error);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setPincode("");
  };

  const openEdit = (dept: any) => {
    setEditingDept(dept);
    setName(dept.name);
    setDescription(dept.description || "");
    setPincode(dept.pincode || "");
    setIsModalOpen(true);
  };

  const filteredDepts = departments.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <a href="/admin" className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-500">
              <ArrowLeft className="w-6 h-6" />
            </a>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Department Management</h1>
              <p className="text-gray-500 font-medium mt-1">Configure municipal sectors and routing rules</p>
            </div>
          </div>
          <button 
            onClick={() => { setEditingDept(null); resetForm(); setIsModalOpen(true); }}
            className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Department
          </button>
        </div>

        {/* Search & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search departments by name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white border-2 border-gray-100 rounded-2xl font-bold text-gray-900 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 transition-all outline-none"
            />
          </div>
          <div className="bg-white px-8 py-4 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Active Sectors</p>
              <h3 className="text-2xl font-black text-gray-900">{departments.length}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Table/List */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">Department Details</th>
                  <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Coverage (Pincode)</th>
                  <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="p-20 text-center">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : filteredDepts.length > 0 ? filteredDepts.map((dept) => (
                  <tr key={dept.id} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-blue-600 font-black">
                          {dept.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 tracking-tight">{dept.name}</p>
                          <p className="text-xs text-gray-500 font-medium truncate max-w-xs">{dept.description || "No description provided."}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      <span className="px-3 py-1 bg-gray-100 rounded-lg text-xs font-bold text-gray-600 tracking-wider">
                        {dept.pincode || "Global"}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => openEdit(dept)}
                          className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={async () => {
                            if (confirm("Are you sure you want to delete this department?")) {
                              try {
                                await axios.delete(`/api/department/${dept.id}`);
                                fetchDepartments();
                              } catch (err) {
                                console.error(err);
                                alert("Error deleting department");
                              }
                            }
                          }}
                          className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="p-20 text-center">
                      <AlertCircle className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                      <p className="text-sm font-bold text-gray-400 tracking-tight">No departments found matching your search.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout */}
          <div className="md:hidden divide-y divide-gray-50">
            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              </div>
            ) : filteredDepts.length > 0 ? filteredDepts.map((dept) => (
              <div key={dept.id} className="p-4 space-y-3 animate-fade-up">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-blue-600 font-black shrink-0">
                      {dept.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-gray-900 truncate">{dept.name}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5 truncate">{dept.description || "No description"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button 
                      onClick={() => openEdit(dept)}
                      className="p-1.5 bg-gray-50 text-gray-400 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={async () => {
                        if (confirm("Delete this department?")) {
                          try { await axios.delete(`/api/department/${dept.id}`); fetchDepartments(); } catch { alert("Error"); }
                        }
                      }}
                      className="p-1.5 bg-gray-50 text-gray-400 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-13">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase">
                    <MapPin className="w-3 h-3" />{dept.pincode || "Global"}
                  </span>
                </div>
              </div>
            )) : (
              <div className="p-12 text-center">
                <AlertCircle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-bold text-gray-400">No departments found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">{editingDept ? "Edit Department" : "Add Department"}</h3>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Configure sector properties</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:text-gray-900 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-4">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Department Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. PUBLIC_HEALTH_DEPARTMENT"
                  className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-gray-900 focus:bg-white focus:border-blue-600 transition-all outline-none"
                  required
                />
              </div>

              <div className="space-y-4">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Primary Pincode</label>
                <input 
                  type="text" 
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="e.g. 110001"
                  className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-gray-900 focus:bg-white focus:border-blue-600 transition-all outline-none"
                />
              </div>

              <div className="space-y-4">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe department responsibilities..."
                  className="w-full h-32 px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-gray-900 focus:bg-white focus:border-blue-600 transition-all outline-none resize-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 hover:shadow-2xl transition-all"
              >
                {editingDept ? "Update Department" : "Save Department"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
