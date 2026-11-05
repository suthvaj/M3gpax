/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { StudentPortal } from './components/StudentPortal';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { initAuth } from './services/firebaseAuth';

type ViewMode = 'student' | 'admin_login' | 'admin_dashboard';

interface AdminSessionUser {
  name: string;
  username: string;
  role: string;
}

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('student');
  const [adminUser, setAdminUser] = useState<AdminSessionUser | null>(null);

  // Initialize Auth state listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        // Logged in with Google Workspace
        setAdminUser({
          name: user.displayName || user.email || 'ผู้ดูแลระบบ Google',
          username: user.email || 'admin',
          role: 'superadmin',
        });
      },
      () => {
        // Signed out
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleLoginSuccess = (user: AdminSessionUser) => {
    setAdminUser(user);
    setViewMode('admin_dashboard');
  };

  const handleLogout = () => {
    setAdminUser(null);
    setViewMode('student');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-['IBM_Plex_Sans_Thai',sans-serif]">
      {viewMode === 'student' && (
        <StudentPortal
          onOpenAdmin={() => {
            if (adminUser) {
              setViewMode('admin_dashboard');
            } else {
              setViewMode('admin_login');
            }
          }}
        />
      )}

      {viewMode === 'admin_login' && (
        <AdminLogin
          onLoginSuccess={handleLoginSuccess}
          onBackToStudent={() => setViewMode('student')}
        />
      )}

      {viewMode === 'admin_dashboard' && adminUser && (
        <AdminDashboard
          currentUser={adminUser}
          onLogout={handleLogout}
          onViewStudentPortal={() => setViewMode('student')}
        />
      )}
    </div>
  );
}
