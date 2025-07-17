import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import TaxCalculationStep from './TaxCalculationStep'
import PrepaymentStep from './PrepaymentStep'

const TaxSimulator = ({ currentStep, setCurrentStep }) => {
  const [simulationData, setSimulationData] = useState({
    inputMethod: 'manual',
    totalEstimatedTax: 0,
    prepayments: { va1: 0, va2: 0, va3: 0, va4: 0 },
    // Add other fields as needed
  })

  const handleProceedToStep2 = () => setCurrentStep(2)
  const handleBackToStep1 = () => setCurrentStep(1)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-teal-500 to-blue-600 px-6 py-4">
          <h1 className="text-2xl font-bold text-white">Belastingsimulator</h1>
          <p className="text-teal-100 mt-1">Projecteer uw belastingverplichtingen en optimaliseer voorschotten</p>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep === 1 ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                <span className="text-sm font-medium">1</span>
              </div>
              <span className={`text-sm font-medium ${currentStep === 1 ? 'text-teal-600' : 'text-gray-400'}`}>Belastingverplichtingen bepalen</span>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep === 2 ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                <span className="text-sm font-medium">2</span>
              </div>
              <span className={`text-sm font-medium ${currentStep === 2 ? 'text-teal-600' : 'text-gray-400'}`}>Voorschotten optimaliseren</span>
            </div>
          </div>
          {currentStep === 1 && (
            <TaxCalculationStep
              simulationData={simulationData}
              setSimulationData={setSimulationData}
              onProceed={handleProceedToStep2}
            />
          )}
          {currentStep === 2 && (
            <PrepaymentStep
              simulationData={simulationData}
              setSimulationData={setSimulationData}
              onBack={handleBackToStep1}
            />
          )}
        </div>
      </div>
    </div>
  )
}
export default TaxSimulator
 