import { useState, useEffect } from 'react';
import { StepProvider } from './context/StepContext';
import Header from './components/Header';
import StepNavigation from './components/StepNavigation';
import DataUpload from './components/steps/DataUpload';
import TemplateDesign from './components/steps/TemplateDesign';
import SenderConfig from './components/steps/SenderConfig';
import SendConfig from './components/steps/SendConfig';
import ErrorBoundary from './components/ErrorBoundary';
import { logger } from './lib/logger';

function App() {
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    // Initialize application logging
    logger.info('Application started', { 
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href 
    });

    // Log page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logger.debug('Application hidden');
      } else {
        logger.debug('Application visible');
      }
    };

    // Log errors that weren't caught by error boundary
    const handleError = (event: ErrorEvent) => {
      logger.error('Uncaught JavaScript error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logger.error('Unhandled promise rejection', {
        reason: event.reason,
        stack: event.reason?.stack,
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <DataUpload />;
      case 2:
        return <TemplateDesign />;
      case 3:
        return <SenderConfig />;
      case 4:
        return <SendConfig />;
      default:
        return <DataUpload />;
    }
  };

  return (
    <ErrorBoundary>
      <StepProvider>
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative">
          {/* Animated Background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -inset-10 opacity-10">
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
              <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
              <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
            </div>
          </div>
          
          <div className="relative z-10">
            <Header />
            <div className="container mx-auto px-6 py-10">
              <StepNavigation currentStep={currentStep} setCurrentStep={setCurrentStep} />
              <div className="mt-10">
                {renderStep()}
              </div>
            </div>
          </div>
        </div>
      </StepProvider>
    </ErrorBoundary>
  );
}

export default App;
