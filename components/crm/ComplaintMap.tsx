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
const leads = [
  { id: "1", name: "Raj Builders", lat: 28.635, lng: 77.225, ward: "Karol Bagh" },
  { id: "2", name: "DLF Homes", lat: 28.459, lng: 77.072, ward: "Dwarka" },
];

import dynamic from "next/dynamic";

const CRMMap = dynamic(() => import("@/components/crm/CRMMap"), { ssr: false });
export default function ComplaintMap() {
  return (
    <div>
      <CRMMap leads={leads} />
    </div>
  );
}
