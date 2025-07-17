import React from 'react'
import { Calculator, FileText, Upload } from 'lucide-react'

export type InputMethod = 'manual' | 'previous' | 'pls'

interface InputMethodSelectorProps {
  inputMethod: InputMethod
  setInputMethod: (method: InputMethod) => void
  onPreviousYear?: () => void
  onUploadPLS?: () => void
}

const InputMethodSelector: React.FC<InputMethodSelectorProps> = ({ inputMethod, setInputMethod, onPreviousYear, onUploadPLS }) => {
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div 
          className={`border rounded-lg p-4 cursor-pointer transition-all ${inputMethod === 'manual' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}
          onClick={() => setInputMethod('manual')}
        >
          <div className="flex items-center space-x-3">
            <Calculator className="w-5 h-5 text-teal-600" />
            <div>
              <h4 className="font-medium text-gray-900">Handmatige invoer</h4>
              <p className="text-sm text-gray-600">Voer bekende bedragen direct in</p>
            </div>
          </div>
        </div>
        <div 
          className={`border rounded-lg p-4 cursor-pointer transition-all ${inputMethod === 'previous' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}
          onClick={onPreviousYear}
        >
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-teal-600" />
            <div>
              <h4 className="font-medium text-gray-900">Vorig jaar als basis</h4>
              <p className="text-sm text-gray-600">Start met cijfers van vorige aangifte</p>
            </div>
          </div>
        </div>
        <div 
          className={`border rounded-lg p-4 cursor-pointer transition-all ${inputMethod === 'pls' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}
          onClick={onUploadPLS}
        >
          <div className="flex items-center space-x-3">
            <Upload className="w-5 h-5 text-teal-600" />
            <div>
              <h4 className="font-medium text-gray-900">Voorlopige P&V</h4>
              <p className="text-sm text-gray-600">Upload tussentijdse proef- en saldibalans</p>
            </div>
          </div>
        </div>
      </div>
      {/* Info boxes for different input methods */}
      {inputMethod === 'manual' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <p className="text-sm text-blue-800">
            <strong>Handmatige invoer:</strong> Voer de verwachte bedragen direct in voor een snelle berekening. U kunt deze waarden op elk moment aanpassen.
          </p>
        </div>
      )}
      {inputMethod === 'previous' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <p className="text-sm text-blue-800">
            <strong>Vorig jaar als basis:</strong> De cijfers van vorig jaar worden overgenomen als basis. U kunt deze aanpassen om een accuratere inschatting te maken voor het huidige boekjaar.
          </p>
        </div>
      )}
      {inputMethod === 'pls' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <p className="text-sm text-blue-800">
            <strong>Extrapolatie:</strong> Resultaat voor 9 maanden geëxtrapoleerd naar 12 maanden.
          </p>
        </div>
      )}
    </div>
  )
}

export default InputMethodSelector 