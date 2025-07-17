import React from 'react'
import { ArrowLeft, Calculator } from 'lucide-react'
import { calculateOptimalPrepayments, Prepayments } from './taxUtils'

interface PrepaymentStepProps {
  totalEstimatedTax: number
  prepayments: Prepayments
  setPrepayments: (prepayments: Prepayments) => void
  optimizationGoal: 'spread' | 'q3' | 'q4'
  setOptimizationGoal: (goal: 'spread' | 'q3' | 'q4') => void
  onBack: () => void
}

const PrepaymentStep: React.FC<PrepaymentStepProps> = ({
  totalEstimatedTax,
  prepayments,
  setPrepayments,
  optimizationGoal,
  setOptimizationGoal,
  onBack,
}) => {
  const handlePrepaymentChange = (quarter: keyof Prepayments, value: string) => {
    setPrepayments({
      ...prepayments,
      [quarter]: parseFloat(value) || 0,
    })
  }

  const handleCalculateOptimal = () => {
    const optimized = calculateOptimalPrepayments({ totalEstimatedTax, prepayments }, optimizationGoal)
    setPrepayments(optimized)
  }

  const totalPrepayments = Object.values(prepayments).reduce((sum, val) => sum + val, 0)
  const taxIncrease = Math.max(0, totalEstimatedTax - totalPrepayments)
  const bonification = Math.max(0, totalPrepayments - totalEstimatedTax) * 0.035
  const finalBalance = totalEstimatedTax - totalPrepayments + bonification

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="btn-secondary inline-flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Terug naar stap 1</span>
        </button>
        <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-3">
          <span className="text-sm font-medium text-teal-800">
            Geprojecteerde belastingschuld: €{totalEstimatedTax.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Voorschotten invoeren</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm font-medium text-gray-700 border-b pb-2">
                <span>Kwartaal</span>
                <span>Vervaldatum</span>
                <span>Bedrag (€)</span>
              </div>
              {(['va1', 'va2', 'va3', 'va4'] as (keyof Prepayments)[]).map((quarter, idx) => (
                <div className="grid grid-cols-3 gap-4 items-center py-2" key={quarter}>
                  <span className="text-sm">{quarter.toUpperCase()}</span>
                  <span className="text-sm text-gray-600">{['voor 10 april', 'voor 10 juli', 'voor 10 oktober', 'voor 20 december'][idx]}</span>
                  <input
                    type="number"
                    value={prepayments[quarter]}
                    onChange={e => handlePrepaymentChange(quarter, e.target.value)}
                    className="input-field"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="font-medium text-gray-900 mb-4">Optimalisatiedoel</h4>
            <select
              value={optimizationGoal}
              onChange={e => setOptimizationGoal(e.target.value as 'spread' | 'q3' | 'q4')}
              className="input-field w-full mb-4"
            >
              <option value="spread">Verdelen over resterende kwartalen</option>
              <option value="q3">Optimaal bedrag alleen voor Q3</option>
              <option value="q4">Optimaal bedrag alleen voor Q4</option>
            </select>
            <button
              onClick={handleCalculateOptimal}
              className="btn-primary w-full inline-flex items-center justify-center space-x-2"
            >
              <Calculator className="w-4 h-4" />
              <span>Bereken optimale voorschotten</span>
            </button>
          </div>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Resultaten</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-sm font-medium text-gray-700">Geprojecteerde belastingschuld</span>
              <span className="text-right font-medium">{totalEstimatedTax.toLocaleString()} €</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-sm font-medium text-gray-700">(-) Totaal voorschotten</span>
              <span className="text-right font-medium">{totalPrepayments.toLocaleString()} €</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-sm font-medium text-gray-700">Vermeerdering</span>
              <span className={`text-right font-medium ${taxIncrease > 0 ? 'text-red-600' : 'text-green-600'}`}>{taxIncrease.toLocaleString()} €</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b">
              <span className="text-sm font-medium text-gray-700">(+) Bonificatie</span>
              <span className="text-right font-medium text-green-600">{bonification.toLocaleString()} €</span>
            </div>
            <div className="flex justify-between items-center py-3 bg-gray-50 rounded-lg px-4">
              <span className="text-base font-semibold text-gray-900">Eindsaldo te betalen</span>
              <span className={`text-right font-bold text-lg ${finalBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>{finalBalance.toLocaleString()} €</span>
            </div>
          </div>
          {taxIncrease === 0 && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm font-medium text-green-800">Optimaal! Geen vermeerdering</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PrepaymentStep
 