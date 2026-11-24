import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { WattWiseProvider, useWattWise } from './context/WattWiseContext';
import { ConsumptionRecord, Equipment } from './types/energy';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DemoBanner } from './components/layout/DemoBanner';
import { DashboardView } from './components/dashboard/DashboardView';
import { DemosView } from './components/demos/DemosView';
import { EquipmentView } from './components/equipment/EquipmentView';
import { EquipmentFormModal } from './components/equipment/EquipmentFormModal';
import { RecordsView } from './components/records/RecordsView';
import { RecordFormModal } from './components/records/RecordFormModal';
import { AnalysisView } from './components/analysis/AnalysisView';
import { AlertsView } from './components/alerts/AlertsView';
import { ReportsView } from './components/reports/ReportsView';
import { AboutView } from './components/about/AboutView';
import { OrganizationView, TeamView } from './components/organization/OrganizationAndTeamView';
import { SettingsView } from './components/settings/SettingsView';
import { PublicPages } from './components/public/PublicPages';
import { LegacyMigrationModal } from './components/migration/LegacyMigrationModal';
import { ToastContainer } from './components/common/ToastContainer';

const WattWiseShell: React.FC = () => {
  const {
    workspaceMode,
    enterDemoSandbox,
    activeSection,
    storageError,
    toasts,
    dismissToast,
    addEquipment,
    updateEquipment,
    addRecord,
    updateRecord,
  } = useWattWise();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);

  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ConsumptionRecord | null>(null);

  const [migrationModalOpen, setMigrationModalOpen] = useState(false);

  useEffect(() => {
    if (workspaceMode === 'saas') {
      enterDemoSandbox();
    }
  }, [workspaceMode, enterDemoSandbox]);

  const openCreateEquipment = () => {
    setEditingEquipment(null);
    setEquipmentModalOpen(true);
  };

  const openEditEquipment = (equipment: Equipment) => {
    setEditingEquipment(equipment);
    setEquipmentModalOpen(true);
  };

  const openCreateRecord = () => {
    setEditingRecord(null);
    setRecordModalOpen(true);
  };

  const openEditRecord = (record: ConsumptionRecord) => {
    setEditingRecord(record);
    setRecordModalOpen(true);
  };

  if (workspaceMode === 'public') {
    return (
      <>
        <PublicPages />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        isMobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="app-main">
        <Header
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onQuickAddRecord={openCreateRecord}
          onQuickAddEquipment={openCreateEquipment}
          onOpenMigrationModal={() => setMigrationModalOpen(true)}
        />

        <main className="app-content">
          {storageError && (
            <div className="storage-error-banner" role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              <span>{storageError}</span>
            </div>
          )}

          <DemoBanner />

          <div key={activeSection} className="view-transition">
            {activeSection === 'dashboard' && (
              <DashboardView
                onAddRecord={openCreateRecord}
                onAddEquipment={openCreateEquipment}
              />
            )}

            {activeSection === 'demos' && <DemosView />}

            {activeSection === 'equipment' && (
              <EquipmentView
                onOpenCreate={openCreateEquipment}
                onOpenEdit={openEditEquipment}
              />
            )}

            {activeSection === 'records' && (
              <RecordsView
                onOpenCreate={openCreateRecord}
                onOpenEdit={openEditRecord}
              />
            )}

            {activeSection === 'analysis' && <AnalysisView />}

            {activeSection === 'alerts' && <AlertsView />}

            {activeSection === 'reports' && <ReportsView />}

            {activeSection === 'about' && <AboutView />}

            {activeSection === 'organization' && <OrganizationView />}

            {activeSection === 'team' && <TeamView />}

            {activeSection === 'settings' && (
              <SettingsView onOpenMigrationModal={() => setMigrationModalOpen(true)} />
            )}
          </div>
        </main>
      </div>

      <EquipmentFormModal
        isOpen={equipmentModalOpen}
        editingEquipment={editingEquipment}
        onClose={() => setEquipmentModalOpen(false)}
        onSubmit={(data) => {
          if (editingEquipment) {
            updateEquipment(editingEquipment.id, data);
          } else {
            addEquipment(data);
          }
        }}
      />

      <RecordFormModal
        isOpen={recordModalOpen}
        editingRecord={editingRecord}
        onClose={() => setRecordModalOpen(false)}
        onSubmit={(data) => {
          if (editingRecord) {
            updateRecord(editingRecord.id, data);
          } else {
            addRecord(data);
          }
        }}
      />

      <LegacyMigrationModal
        isOpen={migrationModalOpen}
        onClose={() => setMigrationModalOpen(false)}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export function App() {
  return (
    <WattWiseProvider>
      <WattWiseShell />
    </WattWiseProvider>
  );
}

export default App;
