// src/app/monte-carlo-test/page.tsx
import EnhancedMonteCarloRunner from '@/components/monte-carlo/EnhancedMonteCarloRunner';

export default function MonteCarloTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Professional Monte Carlo Engine
          </h1>
          <p className="text-xl text-gray-600">
            Enterprise-grade probability analysis with Web Workers
          </p>
          <div className="mt-4 text-sm text-gray-500">
            ✅ Real-terms calculations • ✅ Web Worker processing • ✅ Professional UI
          </div>
        </div>
        
        {/* New enhanced component with Web Workers */}
        <EnhancedMonteCarloRunner />
        
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Phase 2B: Enhanced Monte Carlo - Web Workers + Professional UI</p>
        </div>
      </div>
    </div>
  );
}