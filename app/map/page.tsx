"use client";

import dynamic from "next/dynamic";

const CRMMap = dynamic(() => import("@/components/crm/CRMMap"), { ssr: false });


const leads = [
  { id: "1", name: "Raj Builders", lat: 28.635, lng: 77.225, ward: "Karol Bagh" },
  { id: "2", name: "DLF Homes", lat: 28.459, lng: 77.072, ward: "Dwarka" },
];

export default function LeadsPage() {
  return (
    <div>
      <h1>Leads Map</h1>
      <CRMMap leads={leads} />
    </div>
  );
}