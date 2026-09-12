import { useState } from 'react';
import Sidebar from './Sidebar';
import TopCommandBar from './TopCommandBar';
import CommandPalette from './CommandPalette';

export default function AppShell({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className={`os-layout ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Persistent Left Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Investigation Workspace Area */}
      <div className="os-main-stage">
        {/* Top Command Area */}
        <TopCommandBar onToggleMobile={() => setIsMobileOpen(!isMobileOpen)} />

        {/* Dynamic Page Content */}
        <main className="os-viewport-content">
          {children}
        </main>
      </div>

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette />
    </div>
  );
}
