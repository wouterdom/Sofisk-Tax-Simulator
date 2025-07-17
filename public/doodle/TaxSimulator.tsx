import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import TaxCalculationStep from './TaxCalculationStep'
import PrepaymentStep from './PrepaymentStep'
import { Prepayments } from './taxUtils'
import { InputMethod } from './InputMethodSelector'

interface TaxData {
  belastbareGereserveerdeWinst: number
  verworpenUitgaven: number
  uitgedeeldeDividenden: number
  aftrekbeperkingResultaat: number
  nietBelastbareBestanddelen: number
  definitiefBelastInkomsten: number
  octrooiAftrek: number
  innovatieAftrek: number
  investeringsaftrek: number
  groepsbijdrage: number
  risicokapitaalAftrek: number
  overgedragenDefinitief: number
  overgedragenVrijgesteld: number
  gecompenseerdeVerliezen: number
  overgedragenOnbeperkt: number
  overgedragenRisicokapitaal: number
  meerwaarden25: number
  liquidatiereserve: number
  nietTerugbetaalbaar: number
  terugbetaalbaar: number
}

interface TaxSettings {
  includeSpecialRates: boolean
  applyWithholdings: boolean
}

const defaultTaxData: TaxData = {
  belastbareGereserveerdeWinst: 500000,
  verworpenUitgaven: 0,
  uitgedeeldeDividenden: 0,
  aftrekbeperkingResultaat: 800000,
  nietBelastbareBestanddelen: 0,
  definitiefBelastInkomsten: 0,
  octrooiAftrek: 0,
  innovatieAftrek: 0,
  investeringsaftrek: 0,
  groepsbijdrage: 0,
  risicokapitaalAftrek: 0,
  overgedragenDefinitief: 0,
  overgedragenVrijgesteld: 0,
  gecompenseerdeVerliezen: 0,
  overgedragenOnbeperkt: 0,
  overgedragenRisicokapitaal: 0,
  meerwaarden25: 200000,
  liquidatiereserve: 0,
  nietTerugbetaalbaar: 0,
  terugbetaalbaar: 0,
}

const defaultPrepayments: Prepayments = { va1: 0, va2: 0, va3: 0, va4: 0 }
const defaultTaxSettings: TaxSettings = { includeSpecialRates: true, applyWithholdings: true }

const TaxSimulator: React.FC<{ currentStep: number; setCurrentStep: (step: number) => void }> = ({ currentStep, setCurrentStep }) => {
  const [inputMethod, setInputMethod] = useState<InputMethod>('manual')
  const [taxData, setTaxData] = useState<TaxData>(defaultTaxData)
  const [taxSettings, setTaxSettings] = useState<TaxSettings>(defaultTaxSettings)
  const [totalEstimatedTax, setTotalEstimatedTax] = useState<number>(0)
  const [prepayments, setPrepayments] = useState<Prepayments>(defaultPrepayments)
  const [optimizationGoal, setOptimizationGoal] = useState<'spread' | 'q3' | 'q4'>('spread')

  const handleProceedToStep2 = () => setCurrentStep(2)
  const handleBackToStep1 = () => setCurrentStep(1)

  // Example handlers for previous year and PLS (can be expanded)
  const handlePreviousYear = () => {
    setTaxData({ ...taxData, belastbareGereserveerdeWinst: 75000 })
    setInputMethod('previous')
  }
  const handleUploadPLS = () => {
    setTaxData({ ...taxData, belastbareGereserveerdeWinst: 90000 })
    setInputMethod('pls')
  }

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
              inputMethod={inputMethod}
              setInputMethod={setInputMethod}
              taxData={taxData}
              setTaxData={setTaxData}
              taxSettings={taxSettings}
              setTaxSettings={setTaxSettings}
              onProceed={handleProceedToStep2}
              onPreviousYear={handlePreviousYear}
              onUploadPLS={handleUploadPLS}
            />
          )}
          {currentStep === 2 && (
            <PrepaymentStep
              totalEstimatedTax={totalEstimatedTax}
              prepayments={prepayments}
              setPrepayments={setPrepayments}
              optimizationGoal={optimizationGoal}
              setOptimizationGoal={setOptimizationGoal}
              onBack={handleBackToStep1}
            />
          )}
        </div>
      </div>
    </div>
  )
}
export default TaxSimulator
 