import React, { useState } from "react";
import Contatos from "@/pages/contatos/Contatos";
import DisparoMassa from "@/pages/DisparoMassa";

const tabs = [
  { id: "contatos", label: "Contatos" },
  { id: "disparo", label: "Disparo em Massa" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function CRM() {
  const [activeTab, setActiveTab] = useState<TabId>("contatos");

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-gray-200 bg-white px-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === "contatos" ? <Contatos /> : <DisparoMassa />}
      </div>
    </div>
  );
}
