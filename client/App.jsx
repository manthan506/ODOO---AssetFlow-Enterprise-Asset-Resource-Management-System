import React, { useState } from 'react';
import Dashboard from './src/pages/Dashboard';
import OrgSetup from './src/pages/OrgSetup';
import Assets from './src/pages/Assets';
import Allocation from './src/pages/Allocation';
import ResourceBooking from './src/pages/ResourceBooking';
import Maintenance from './src/pages/Maintenance';
import Audit from './src/pages/Audit';
import Notifications from './src/pages/Notifications';

const navItems = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'org', label: 'Org Setup' },
  { id: 'assets', label: 'Assets' },
  { id: 'allocations', label: 'Allocations' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'audit', label: 'Audit' },
  { id: 'notifications', label: 'Notifications' }
];

const pageMap = {
  dashboard: <Dashboard />,
  org: <OrgSetup />,
  assets: <Assets />,
  allocations: <Allocation />,
  bookings: <ResourceBooking />,
  maintenance: <Maintenance />,
  audit: <Audit />,
  notifications: <Notifications />
};

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');

  return (
    <div style={styles.app}>
      <aside style={styles.sidebar}>
        <div>
          <h1 style={styles.logo}>AssetFlow</h1>
          <p style={styles.tagline}>Enterprise asset & resource management demo</p>
        </div>
        <nav>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              style={{
                ...styles.navButton,
                ...(activePage === item.id ? styles.navButtonActive : {})
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Workflow demo</p>
            <h2 style={styles.title}>See the end-to-end asset lifecycle in one place</h2>
          </div>
          <div style={styles.statusBadge}>MVP workflow live</div>
        </header>
        {pageMap[activePage]}
      </main>
    </div>
  );
}

const styles = {
  app: {
    minHeight: '100vh',
    display: 'flex',
    background: '#f8fafc',
    color: '#0f172a',
    fontFamily: 'Inter, Arial, sans-serif'
  },
  sidebar: {
    width: '260px',
    background: '#0f172a',
    color: 'white',
    padding: '24px 18px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  },
  logo: { margin: '0 0 8px', fontSize: '1.5rem' },
  tagline: { margin: 0, color: '#cbd5e1', fontSize: '0.95rem' },
  navButton: {
    width: '100%',
    border: 'none',
    background: 'transparent',
    color: 'white',
    textAlign: 'left',
    padding: '12px 10px',
    borderRadius: '10px',
    marginBottom: '8px',
    cursor: 'pointer',
    fontSize: '0.95rem'
  },
  navButtonActive: {
    background: '#1d4ed8'
  },
  main: {
    flex: 1,
    padding: '24px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  eyebrow: { margin: 0, color: '#2563eb', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' },
  title: { margin: '4px 0 0', fontSize: '1.5rem' },
  statusBadge: {
    background: '#dcfce7',
    color: '#166534',
    padding: '8px 12px',
    borderRadius: '999px',
    fontWeight: 700
  }
};
