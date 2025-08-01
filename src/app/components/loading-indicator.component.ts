import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-indicator',
  standalone: true,
  imports: [],
  template: `
    @if (show) {
      <div class="flex items-center justify-center py-4">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span class="ml-2 text-blue-600">{{ message }}</span>
      </div>
    }
  `
})
export class LoadingIndicatorComponent {
  @Input() show = true;
  @Input() message = 'Berekenen...';
}