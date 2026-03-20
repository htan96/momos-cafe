"use client";

import { useState, useEffect } from "react";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminPanel from "@/components/admin/AdminPanel";

const ADMIN_PASSWORD = "momos123";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem("admin_auth");
    if (auth === "true") {
      setIsAuthenticated(true);
    }
    setMounted(true);
  }, []);

  const handleLogin = () => {
    setError("");
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem("admin_auth", "true");
      setPassword("");
    } else {
      setError("Incorrect password. Please try again.");
      setPassword("");
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-gray-mid">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <AdminLogin
        password={password}
        onPasswordChange={setPassword}
        onSubmit={handleLogin}
        error={error}
      />
    );
  }

  return <AdminPanel />;
}
