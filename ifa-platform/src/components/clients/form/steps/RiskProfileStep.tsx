import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import type { ClientFormData, RiskProfile } from '@/types/client';

interface RiskProfileStepProps {
  formData: ClientFormData;
  onUpdateRiskProfile: (updates: Partial<RiskProfile>) => void;
}

export function RiskProfileStep({ formData, onUpdateRiskProfile }: RiskProfileStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 sm:space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            Risk assessment questionnaires will be completed separately. This section is for reference only.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Risk Tolerance</label>
            <select
              value={formData.riskProfile?.riskTolerance || ''}
              onChange={(e) => onUpdateRiskProfile({ riskTolerance: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md text-base sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Not yet assessed</option>
              <option value="conservative">Conservative</option>
              <option value="moderate">Moderate</option>
              <option value="balanced">Balanced</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Knowledge & Experience</label>
            <select
              value={formData.riskProfile?.knowledgeExperience || ''}
              onChange={(e) => onUpdateRiskProfile({ knowledgeExperience: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md text-base sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Not yet assessed</option>
              <option value="basic">Basic</option>
              <option value="informed">Informed</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Attitude to Risk (1-10): {formData.riskProfile?.attitudeToRisk || 5}
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={formData.riskProfile?.attitudeToRisk || 5}
            onChange={(e) => onUpdateRiskProfile({ attitudeToRisk: parseInt(e.target.value, 10) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Very Low Risk</span>
            <span>Very High Risk</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
