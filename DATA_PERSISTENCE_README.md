# Data Persistence Feature

## Overview

The Sofisk Tax Simulator now includes a data persistence feature that allows you to save your input data in the browser's localStorage. This means your data will persist across browser sessions and page refreshes.

## Features

### Automatic Data Saving
- All input values in the "Vereenvoudigde aangifte" section are automatically saved as you type
- Prepayment values (VA1, VA2, VA3, VA4) are automatically saved
- Input method selection is saved
- Optimization goal selection is saved

### Data Management Controls
Located at the top of the "Vereenvoudigde aangifte" page, you'll find several data management options:

#### Reset to Defaults
- Click to restore all values to their original default state
- Useful for starting fresh or testing

#### Export Data
- Downloads a JSON file containing all your current data
- File is named with the current date (e.g., `tax-data-2025-01-29.json`)
- Useful for backing up your data or sharing with others

#### Import Data
- Click to open an import dialog
- Paste JSON data from a previously exported file
- Click "Import" to load the data
- Shows success/error messages

#### Clear All Data
- Removes all saved data from the browser
- Requires confirmation to prevent accidental data loss

### Status Indicator
- Shows "Last saved: [timestamp]" to indicate when data was last updated
- Updates automatically as you make changes

## How It Works

### Data Storage
- Data is stored in the browser's localStorage under the key `sofisk_tax_data`
- Data persists until you clear it or clear your browser data
- Each browser/device has its own separate data storage

### Data Structure
The saved data includes:
- All declaration section values (codes 1080, 1240, 1320, etc.)
- Section totals and subtotals
- Input method selection (manual/previous/upload)
- Prepayment values (VA1, VA2, VA3, VA4)
- Optimization goal selection
- Timestamp of last update

### Automatic Calculations
- Section totals are automatically calculated and saved
- The main subtotal (Code 1460) is calculated as: Section 1 total - Section 2 total
- All calculations are performed in real-time as you type

## Browser Compatibility

This feature works in all modern browsers that support localStorage:
- Chrome
- Firefox
- Safari
- Edge

## Data Privacy

- Data is stored locally in your browser only
- No data is sent to external servers
- You have full control over your data
- Data can be exported, imported, or cleared at any time

## Troubleshooting

### Data Not Saving
- Check if localStorage is enabled in your browser
- Try refreshing the page to see if data persists
- Check browser console for any error messages

### Import Not Working
- Ensure the JSON format is correct
- Try exporting data first to see the expected format
- Check that the JSON file is not corrupted

### Data Lost
- Check if you accidentally cleared browser data
- Try importing from a previously exported backup
- Use "Reset to Defaults" to restore initial values

## Technical Details

### Service Architecture
- `TaxDataService` manages all data persistence
- Uses RxJS BehaviorSubject for reactive data updates
- Automatic error handling with fallback to defaults
- TypeScript interfaces ensure type safety

### Integration
- Components subscribe to data changes
- Automatic saving on any data modification
- Seamless integration with existing calculation logic 