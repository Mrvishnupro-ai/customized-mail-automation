import { ChevronLeft, ChevronRight, Database, Palette, Settings, Send } from 'lucide-react';

interface StepNavigationProps {
  currentStep: number;
  setCurrentStep: (step: number) => void;
}

const steps = [
  { number: 1, title: 'Data Upload', subtitle: 'Import & Manage', icon: Database },
  { number: 2, title: 'Template Design', subtitle: 'Create & Customize', icon: Palette },
  { number: 3, title: 'Sender Config', subtitle: 'Authentication', icon: Settings },
  { number: 4, title: 'Send & Review', subtitle: 'Launch Campaign', icon: Send },
];

export default function StepNavigation({ currentStep, setCurrentStep }: StepNavigationProps) {
  return (
    <div className="bg-gradient-to-r from-slate-800 via-slate-800 to-slate-700 rounded-xl shadow-2xl border border-slate-600 p-8">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          className="flex items-center gap-3 px-6 py-3 bg-slate-700/50 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 backdrop-blur-sm border border-slate-600"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="font-medium">Previous</span>
        </button>

        <div className="flex items-center gap-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;
            
            return (
              <div key={step.number} className="flex items-center">
                <button
                  onClick={() => setCurrentStep(step.number)}
                  className={`relative group flex flex-col items-center justify-center w-32 h-28 rounded-xl transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-xl shadow-emerald-500/30 scale-105'
                      : isCompleted
                      ? 'bg-gradient-to-br from-slate-700 to-slate-800 text-emerald-400 hover:from-slate-600 hover:to-slate-700 border border-emerald-500/30'
                      : 'bg-gradient-to-br from-slate-700 to-slate-800 text-slate-400 hover:from-slate-600 hover:to-slate-700 border border-slate-600'
                  }`}
                >
                  <div className={`p-2 rounded-lg mb-2 ${
                    isActive ? 'bg-white/20' : isCompleted ? 'bg-emerald-500/20' : 'bg-slate-600/50'
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold mb-1">{step.title}</span>
                  <span className="text-xs opacity-75">{step.subtitle}</span>
                  
                  {/* Step Number Badge */}
                  <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isActive
                      ? 'bg-white text-emerald-600'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-600 text-slate-300'
                  }`}>
                    {step.number}
                  </div>

                  {/* Progress Ring */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-xl border-2 border-white/30 animate-pulse"></div>
                  )}
                </button>
                
                {index < steps.length - 1 && (
                  <div className="flex items-center mx-2">
                    <div className={`w-12 h-1 rounded-full transition-all duration-500 ${
                      isCompleted ? 'bg-emerald-400' : 'bg-slate-600'
                    }`} />
                    <ChevronRight className={`w-4 h-4 mx-1 transition-colors ${
                      isCompleted ? 'text-emerald-400' : 'text-slate-600'
                    }`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setCurrentStep(Math.min(4, currentStep + 1))}
          disabled={currentStep === 4}
          className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-emerald-500/25"
        >
          <span className="font-medium">Next</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
