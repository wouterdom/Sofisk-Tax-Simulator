import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface FileOption {
  id: string;
  name: string;
  fiscalYear: number;
  lastModified: string;
  status: string;
}

@Component({
  selector: 'app-file-selection',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" (click)="onBackdropClick($event)">
      <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900">Selecteer een bestand</h3>
            <button 
              type="button" 
              class="text-gray-400 hover:text-gray-600"
              (click)="onCancel()">
              <span class="sr-only">Sluiten</span>
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div class="mb-4">
            <p class="text-sm text-gray-600">
              Selecteer een bestaande aangifte om als basis te gebruiken voor de nieuwe berekening.
            </p>
          </div>

          <!-- File List -->
          <div class="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
            @if (files.length === 0) {
              <div class="p-4 text-center text-gray-500">
                <p>Geen bestanden beschikbaar</p>
              </div>
            } @else {
              @for (file of files; track file.id) {
                <div 
                  class="p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                  [class.bg-blue-50]="selectedFileId === file.id"
                  (click)="selectFile(file.id)">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <h4 class="text-sm font-medium text-gray-900">{{ file.name }}</h4>
                      <div class="flex items-center space-x-4 mt-1">
                        <span class="text-xs text-gray-500">Fiscaal jaar: {{ file.fiscalYear }}</span>
                        <span class="text-xs text-gray-500">Laatst gewijzigd: {{ formatDate(file.lastModified) }}</span>
                        <span 
                          class="text-xs px-2 py-1 rounded-full"
                          [class]="getStatusClass(file.status)">
                          {{ file.status }}
                        </span>
                      </div>
                    </div>
                    @if (selectedFileId === file.id) {
                      <div class="ml-3">
                        <svg class="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                      </div>
                    }
                  </div>
                </div>
              }
            }
          </div>

          <!-- Action Buttons -->
          <div class="flex justify-end space-x-3 mt-6">
            <button 
              type="button"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              (click)="onCancel()">
              Annuleren
            </button>
            <button 
              type="button"
              class="px-6 py-3 text-base font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              [disabled]="!selectedFileId"
              (click)="onConfirm()">
              Select en navigeer naar stap 2
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class FileSelectionComponent {
  @Input() files: FileOption[] = [];
  @Output() fileSelected = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  selectedFileId: string | null = null;

  selectFile(fileId: string): void {
    this.selectedFileId = fileId;
  }

  onConfirm(): void {
    if (this.selectedFileId) {
      this.fileSelected.emit(this.selectedFileId);
    }
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'todo':
        return 'bg-yellow-100 text-yellow-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'processed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
} 