"use client";

import { useState } from "react";
import SettingsPanel from "./SettingsPanel";
import CateringRequestsPanel from "./CateringRequestsPanel";

type Tab = "settings" | "catering";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<Tab>("settings");

  const handleLogout = () => {
    localStorage.removeItem("admin_auth");
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-cream text-charcoal">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-3xl text-charcoal">
            Admin Panel
          </h1>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-gray-mid hover:text-red font-medium"
          >
            Sign out
          </button>
        </div>
        <p className="text-gray-mid mb-6">
          Welcome to the Momo&apos;s Café admin area.
        </p>

        <div className="flex gap-1 border-b-2 border-cream-dark mb-6">
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`px-5 py-3 font-semibold text-sm tracking-wide transition-colors ${
              activeTab === "settings"
                ? "text-teal border-b-2 border-teal -mb-[2px] bg-white rounded-t-lg"
                : "text-gray-mid hover:text-charcoal"
            }`}
          >
            Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("catering")}
            className={`px-5 py-3 font-semibold text-sm tracking-wide transition-colors ${
              activeTab === "catering"
                ? "text-teal border-b-2 border-teal -mb-[2px] bg-white rounded-t-lg"
                : "text-gray-mid hover:text-charcoal"
            }`}
          >
            Catering Inquiries
          </button>
        </div>

        {activeTab === "settings" && (
          <>
            <SettingsPanel />
            <div className="bg-white border-2 border-cream-dark rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
              <h2 className="font-display text-xl text-charcoal mb-4">
                Quick Links
              </h2>
              <ul className="space-y-2 text-teal-dark">
                <li>
                  <a href="/order" className="hover:underline">
                    View Order Page →
                  </a>
                </li>
                <li>
                  <a href="/menu" className="hover:underline">
                    View Menu Page →
                  </a>
                </li>
                <li>
                  <a
                    href="/menu/print"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-semibold text-red hover:underline"
                  >
                    View / Print Menu
                    <span className="text-xs font-normal text-gray-mid">
                      (opens print layout)
                    </span>
                  </a>
                </li>
              </ul>
            </div>
          </>
        )}

        {activeTab === "catering" && <CateringRequestsPanel />}
      </div>
    </div>
  );
}
