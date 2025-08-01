import { Directive, ElementRef, Input, OnInit } from '@angular/core';

/**
 * Common UI class combinations used throughout the application
 */
export const UI_CLASSES = {
  // Card styles
  card: 'bg-white border rounded-xl shadow-sm p-6',
  cardCompact: 'bg-white border rounded-lg shadow-sm p-4',
  
  // Table cell styles
  tableCell: 'px-3 py-2 text-right font-medium',
  tableCellLeft: 'px-3 py-2 text-left',
  tableCellCenter: 'px-3 py-2 text-center',
  
  // Row styles
  tableRow: 'border-b last:border-b-0 hover:bg-teal-50',
  tableRowHighlight: 'border-b last:border-b-0 hover:bg-teal-50 font-bold bg-teal-50',
  
  // Button styles
  buttonPrimary: 'px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors',
  buttonSecondary: 'px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors',
  buttonDanger: 'px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors',
  
  // Form styles
  formLabel: 'block text-sm font-medium text-gray-700 mb-1',
  formInput: 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500',
  
  // Loading and state styles
  loading: 'flex items-center justify-center py-4',
  loadingSpinner: 'animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600',
  
  // Layout styles
  gridTwoColumns: 'grid grid-cols-1 md:grid-cols-2 gap-4',
  gridLgTwoColumns: 'grid grid-cols-1 lg:grid-cols-2 gap-4',
  spacingY6: 'space-y-6',
  spacingY4: 'space-y-4',
  
  // Text styles
  textTitle: 'text-lg font-semibold text-gray-900',
  textSubtitle: 'text-md font-semibold text-gray-900',
  textCaption: 'text-sm text-gray-500',
  textError: 'text-sm text-red-600',
  textSuccess: 'text-sm text-green-600',
  
  // Info box styles
  infoBoxBlue: 'mt-4 p-4 rounded bg-blue-50 border border-blue-200',
  infoBoxYellow: 'mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-900 rounded',
  infoBoxGreen: 'mt-4 p-4 bg-green-50 border-l-4 border-green-400 text-green-900 rounded',
  infoBoxRed: 'mt-4 p-4 bg-red-50 border-l-4 border-red-400 text-red-900 rounded'
} as const;

export type UIClassKey = keyof typeof UI_CLASSES;

/**
 * Directive to apply common UI class combinations
 * Usage: <div uiClass="card">...</div>
 */
@Directive({
  selector: '[uiClass]',
  standalone: true
})
export class UIClassDirective implements OnInit {
  @Input() uiClass!: UIClassKey;

  constructor(private el: ElementRef) {}

  ngOnInit(): void {
    if (this.uiClass && UI_CLASSES[this.uiClass]) {
      const classes = UI_CLASSES[this.uiClass].split(' ');
      classes.forEach(cls => {
        if (cls.trim()) {
          this.el.nativeElement.classList.add(cls.trim());
        }
      });
    }
  }
}

/**
 * Service to get UI class strings programmatically
 */
export class UIClassService {
  static getClass(key: UIClassKey): string {
    return UI_CLASSES[key] || '';
  }

  static combineClasses(...keys: UIClassKey[]): string {
    return keys.map(key => UI_CLASSES[key] || '').join(' ');
  }
}