// src/App.tsx
import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { BenchmarkModal } from './components/BenchmarkModal';

// Auth Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';

// Main Application Pages
import { Dashboard } from './pages/Dashboard';
import { BillingEngine } from './pages/BillingEngine';
import { SubscriptionsList } from './pages/SubscriptionsList';
import { SubscriptionDetail } from './pages/SubscriptionDetail';
import { InvoicesList } from './pages/InvoicesList';
import { InvoiceDetail } from './pages/InvoiceDetail';
import { QuotationTemplates } from './pages/QuotationTemplates';
import { ProductsList } from './pages/ProductsList';
import { PlansList } from './pages/PlansList';
import { DiscountsList } from './pages/DiscountsList';
import { TaxesList } from './pages/TaxesList';
import { StaffManagement } from './pages/StaffManagement';
import { CustomerPortal } from './pages/CustomerPortal';

export const App: React.FC = () => {
  const { user, loading } = useAuth();

  // Navigation state
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [resetTokenInfo, setResetTokenInfo] = useState<{ token: string; email: string } | null>(null);

  // Selected item IDs for detail views
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<number | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);

  // Benchmark modal
  const [showBenchmark, setShowBenchmark] = useState(false);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center space-x-3 text-purple-700 font-bold text-sm">
          <div className="w-5 h-5 border-2 border-purple-700 border-t-transparent rounded-full animate-spin" />
          <span>Loading Brightloop System...</span>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Authentication flows
  if (!user) {
    switch (authView) {
      case 'register':
        return <Register onNavigateToLogin={() => setAuthView('login')} />;
      case 'forgot':
        return (
          <ForgotPassword
            onNavigateToLogin={() => setAuthView('login')}
            onNavigateToReset={(token, email) => {
              setResetTokenInfo({ token, email });
              setAuthView('reset');
            }}
          />
        );
      case 'reset':
        return (
          <ResetPassword
            token={resetTokenInfo?.token || ''}
            email={resetTokenInfo?.email || ''}
            onNavigateToLogin={() => setAuthView('login')}
          />
        );
      case 'login':
      default:
        return (
          <Login
            onNavigateToRegister={() => setAuthView('register')}
            onNavigateToForgot={() => setAuthView('forgot')}
          />
        );
    }
  }

  // Helper for navigating to invoice detail
  const handleNavigateToInvoice = (id: number) => {
    setSelectedInvoiceId(id);
    setCurrentTab('invoice_detail');
  };

  // Helper for navigating to subscription detail
  const handleNavigateToSubscription = (id: number) => {
    setSelectedSubscriptionId(id);
    setCurrentTab('subscription_detail');
  };

  // Render main page content
  const renderContent = () => {
    // Customer Portal routes
    if (user.role === 'customer') {
      return <CustomerPortal />;
    }

    // Staff & Admin routes
    switch (currentTab) {
      case 'dashboard':
        return (
          <Dashboard
            onNavigateToInvoice={handleNavigateToInvoice}
            onNavigateToSubscription={handleNavigateToSubscription}
          />
        );

      case 'billing_engine':
        return (
          <BillingEngine
            onNavigateToInvoice={handleNavigateToInvoice}
            onNavigateToInvoicesList={() => setCurrentTab('invoices')}
          />
        );

      case 'subscriptions':
        return (
          <SubscriptionsList
            onSelectSubscription={(id) => handleNavigateToSubscription(id)}
          />
        );

      case 'subscription_detail':
        return selectedSubscriptionId ? (
          <SubscriptionDetail
            subscriptionId={selectedSubscriptionId}
            onBack={() => setCurrentTab('subscriptions')}
            onNavigateToInvoice={handleNavigateToInvoice}
          />
        ) : (
          <SubscriptionsList onSelectSubscription={(id) => handleNavigateToSubscription(id)} />
        );

      case 'invoices':
        return (
          <InvoicesList
            onSelectInvoice={(id) => handleNavigateToInvoice(id)}
          />
        );

      case 'invoice_detail':
        return selectedInvoiceId ? (
          <InvoiceDetail
            invoiceId={selectedInvoiceId}
            onBack={() => setCurrentTab('invoices')}
            onNavigateToSubscription={handleNavigateToSubscription}
          />
        ) : (
          <InvoicesList onSelectInvoice={(id) => handleNavigateToInvoice(id)} />
        );

      case 'quotation_templates':
        return (
          <QuotationTemplates
            onStartQuoteFromTemplate={(templateId) => {
              setCurrentTab('subscriptions');
            }}
          />
        );

      case 'products':
        return <ProductsList />;

      case 'plans':
        return <PlansList />;

      case 'discounts':
        return <DiscountsList />;

      case 'taxes':
        return <TaxesList />;

      case 'staff':
        return <StaffManagement />;

      default:
        return (
          <Dashboard
            onNavigateToInvoice={handleNavigateToInvoice}
            onNavigateToSubscription={handleNavigateToSubscription}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        activeTab={currentTab}
        onNavigateToReset={(token, email) => {
          setResetTokenInfo({ token, email });
          setAuthView('reset');
        }}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            if (tab === 'subscriptions') setSelectedSubscriptionId(null);
            if (tab === 'invoices') setSelectedInvoiceId(null);
            setCurrentTab(tab);
          }}
          onOpenBenchmark={() => setShowBenchmark(true)}
        />

        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>

      <BenchmarkModal
        isOpen={showBenchmark}
        onClose={() => setShowBenchmark(false)}
      />
    </div>
  );
};

