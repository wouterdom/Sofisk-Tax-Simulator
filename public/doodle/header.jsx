import  { Calculator, Settings, User } from 'lucide-react'

const Header = () => {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Sofisk</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-teal-600 border-b-2 border-teal-600 pb-2 text-sm font-medium">
                Vennootschapsbelasting
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-700 text-sm font-medium">
                Personenbelasting
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-700 text-sm font-medium">
                Contacten
              </a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <Calculator className="w-5 h-5 text-gray-500" />
            <Settings className="w-5 h-5 text-gray-500" />
            <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">WD</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
 