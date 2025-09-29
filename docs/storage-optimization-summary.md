# Storage Format Optimization Summary

## Overview
Optimized the data storage format in the `.baseline-gate` directory to align more closely with the `IssuePayload` type, reducing transformation overhead in `dataTransformation.ts`.

## Changes Made

### 1. New Storage Types
- **Added `StoredIssuePayload`**: A storage type that closely mirrors `IssuePayload` but includes the `uri` field for file location
- **Added `StoredScanPayload`**: Contains an array of `StoredIssuePayload` instead of the previous `PersistedFinding` format
- **Maintained backward compatibility**: Kept legacy `PersistedFinding` types for reading older storage files

### 2. Version Update
- **Updated `LATEST_SCAN_VERSION`**: Changed from `1` to `2` to indicate the new storage format
- **Backward compatibility**: Old version 1 files are still supported via legacy parsing methods

### 3. Enhanced Serialization/Deserialization

#### New Methods
- **`serializeFindingToStoredIssue()`**: Converts `BaselineFinding` to `StoredIssuePayload` format
- **`parseStoredScan()`**: Parses new v2 format storage files
- **`deserializeStoredIssues()`**: Converts stored issues back to `BaselineFinding` objects

#### Updated Methods
- **`restoreLatestScanFromDisk()`**: Now tries new format first, falls back to legacy format
- **`persistLatestScan()`**: Uses new `StoredScanPayload` format

### 4. Data Transformation Optimization

#### New Function in `dataTransformation.ts`
- **`buildIssuePayloadFromStored()`**: Creates `IssuePayload` directly from stored data with minimal transformation

## Benefits

### 1. Reduced Transformation Overhead
- **Before**: `PersistedFinding` → `BaselineFinding` → `IssuePayload` (2 transformations)
- **After**: `StoredIssuePayload` → `BaselineFinding` → `IssuePayload` (2 transformations, but less data processing in the first step)
- **Future potential**: Direct `StoredIssuePayload` → `IssuePayload` (1 transformation)

### 2. Pre-computed Values
The new storage format includes pre-computed values that would otherwise need to be calculated during transformation:
- `verdictLabel` (formatted verdict)
- `featureName` (feature display name)
- `line` and `column` (1-based positioning)
- `docsUrl` (documentation link)

### 3. Better Data Alignment
- Storage format now closely matches the UI consumption format
- Reduces the need for field mapping and computation during rendering
- Makes the data flow more predictable and efficient

### 4. Backward Compatibility
- Existing `.baseline-gate/latest-scan.json` files continue to work
- Gradual migration to new format as users perform new scans
- No data loss during the transition

## File Structure
```
.baseline-gate/
├── latest-scan.json (now uses StoredScanPayload format)
└── scan-history.json (unchanged)
```

## Storage Format Example

### New Format (v2)
```json
{
  "version": 2,
  "target": "modern",
  "scannedAt": "2025-09-29T...",
  "issues": [
    {
      "id": "file:///path/to/file.js::feature-id::10::5",
      "verdict": "warning",
      "verdictLabel": "Warning",
      "featureName": "Feature Name",
      "featureId": "feature-id",
      "token": "some-code",
      "line": 11,
      "column": 6,
      "docsUrl": "https://...",
      "snippet": "const x = some-code;",
      "range": {
        "start": { "line": 10, "character": 5 },
        "end": { "line": 10, "character": 14 }
      },
      "uri": "file:///path/to/file.js"
    }
  ]
}
```

### Legacy Format (v1) - Still Supported
```json
{
  "version": 1,
  "target": "modern", 
  "scannedAt": "2025-09-29T...",
  "findings": [
    {
      "uri": "file:///path/to/file.js",
      "featureId": "feature-id",
      "verdict": "warning",
      "token": "some-code",
      "lineText": "const x = some-code;",
      "range": {
        "start": { "line": 10, "character": 5 },
        "end": { "line": 10, "character": 14 }
      }
    }
  ]
}
```

## Future Optimization Opportunities

1. **Direct Storage-to-UI Pipeline**: Implement direct conversion from `StoredIssuePayload` to `IssuePayload` without going through `BaselineFinding`

2. **In-Memory Caching**: Cache the `StoredIssuePayload` format in memory to avoid repeated transformations

3. **Lazy Loading**: Load and transform data only when needed for display

4. **Compression**: Compress storage files for large workspaces

## Migration Impact
- **Automatic**: Users don't need to do anything; migration happens on next scan
- **Seamless**: Old data remains accessible during transition
- **Performance**: Immediate benefits for new scans, gradual improvement as old data is replaced