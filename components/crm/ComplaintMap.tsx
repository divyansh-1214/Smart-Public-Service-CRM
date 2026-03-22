"use client";

import { 
  Map as MapIcon, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  Locate,
  Filter,
  Maximize2
} from "lucide-react";

export default function ComplaintMap() {
  return (
    <div className="w-full h-[600px] bg-gray-100 rounded-3xl border border-gray-200 relative overflow-hidden group">
      {/* Mock Map Background */}
      <div className="absolute inset-0 bg-slate-50 flex items-center justify-center opacity-40">
        <MapIcon className="w-64 h-64 text-slate-200" />
      </div>

      {/* Mock Grid Lines */}
      <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 pointer-events-none">
        {Array.from({ length: 144 }).map((_, i) => (
          <div key={i} className="border-[0.5px] border-slate-200" />
        ))}
      </div>

      {/* Mock Pins */}
      <div className="absolute inset-0 p-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-4 h-4 bg-rose-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
        <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-amber-500 rounded-full border-2 border-white shadow-lg animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-1/3 left-2/3 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/4 left-1/4 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-lg animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-1/2 left-3/4 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white shadow-lg animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Controls Overlay */}
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-3">
        <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100 max-w-xs">
          <h3 className="font-bold text-gray-900 mb-1">Grievance Heatmap</h3>
          <p className="text-xs text-gray-500 leading-relaxed mb-4">
            Real-time visual representation of active complaints across the city wards.
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400">
              <span>Category Distribution</span>
              <span className="text-blue-600">All Layers</span>
            </div>
            <div className="flex gap-1 h-1.5 rounded-full overflow-hidden">
              <div className="w-1/3 bg-rose-500" />
              <div className="w-1/4 bg-amber-500" />
              <div className="w-1/6 bg-blue-500" />
              <div className="w-1/4 bg-emerald-500" />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="p-3 bg-white rounded-xl shadow-lg border border-gray-100 hover:bg-gray-50 transition-all">
            <Filter className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-3 bg-white rounded-xl shadow-lg border border-gray-100 hover:bg-gray-50 transition-all">
            <Layers className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-2">
        <button className="p-3 bg-white rounded-xl shadow-lg border border-gray-100 hover:bg-gray-50 transition-all">
          <Maximize2 className="w-5 h-5 text-gray-600" />
        </button>
        <button className="p-3 bg-white rounded-xl shadow-lg border border-gray-100 hover:bg-gray-50 transition-all">
          <Locate className="w-5 h-5 text-blue-600" />
        </button>
        <div className="flex flex-col bg-white rounded-xl shadow-lg border border-gray-100 divide-y divide-gray-100">
          <button className="p-3 hover:bg-gray-50 transition-all rounded-t-xl">
            <ZoomIn className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-3 hover:bg-gray-50 transition-all rounded-b-xl">
            <ZoomOut className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 left-6 z-10 bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-gray-100 shadow-xl flex gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-rose-500 rounded-full" />
          <span className="text-[10px] font-bold text-gray-600 uppercase">Critical</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-amber-500 rounded-full" />
          <span className="text-[10px] font-bold text-gray-600 uppercase">High</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full" />
          <span className="text-[10px] font-bold text-gray-600 uppercase">Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-emerald-500 rounded-full" />
          <span className="text-[10px] font-bold text-gray-600 uppercase">Low</span>
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
          <MapIcon className="w-5 h-5 text-blue-600" />
          <span className="font-bold text-gray-900">Interactive Map Interface</span>
        </div>
      </div>
    </div>
  );
}
