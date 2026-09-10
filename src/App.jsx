import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import Sidebar from './components/Sidebar'
import DashboardPage from './pages/DashboardPage'
import LeadsPage from './pages/LeadsPage'
import ReportsPage from './pages/ReportsPage'
import BranchesPage from './pages/BranchesPage'
import SettingsPage from './pages/SettingsPage'
import OverduePage from './pages/OverduePage'
import StatsPage from './pages/StatsPage'

function AppContent() {
  const { user, profile, loading } = useAuth()
  const [activePage, setActivePage] = useState(null)

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚗</div>
          <div style={{ fontSize: '18px', fontWeight: '700' }}>سكاي كلر</div>
          <div style={{ fontSize: '14px', opacity: 0.8, marginTop: '4px' }}>جاري التحميل...</div>
        </div>
      </div>
    )
  }

  if (!user || !profile) return <LoginPage />

  // Determine default page per role
  const getDefaultPage = () => {
    if (profile.role === 'rep') return 'leads'
    return 'dashboard'
  }

  const currentPage = activePage || getDefaultPage()

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage />
      case 'leads': return <LeadsPage />
      case 'reports': return <ReportsPage />
      case 'branches': return <BranchesPage />
      case 'settings': return <SettingsPage />
      case 'overdue': return <OverduePage />
      case 'stats': return <StatsPage />
      default: return <DashboardPage />
    }
  }

  return (
    <div className="layout">
      <Sidebar activePage={currentPage} onNavigate={setActivePage} />
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            fontFamily: 'inherit',
            direction: 'rtl',
            fontSize: '14px',
          },
        }}
      />
      <AppContent />
    </AuthProvider>
  )
}
