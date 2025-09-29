# API Changes for Storage Optimization

## New Types Added

### `StoredIssuePayload`
```typescript
type StoredIssuePayload = {
  id: string;
  verdict: Verdict;
  verdictLabel: string;
  featureName: string;
  featureId: string;
  token: string;
  line: number;
  column: number;
  docsUrl?: string;
  snippet: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  uri: string; // Added to store file URI
};
```

### `StoredScanPayload`
```typescript
type StoredScanPayload = {
  version: number;
  target: Target;
  scannedAt: string;
  issues: StoredIssuePayload[];
};
```

## New Methods Added

### In `BaselineAnalysisViewProvider`

#### `parseStoredScan(raw: unknown): StoredScanPayload | null`
Parses the new v2 storage format.

#### `deserializeStoredIssues(entries: StoredIssuePayload[]): BaselineFinding[]`
Converts stored issues back to BaselineFinding objects with optimized transformation.

#### `serializeFindingToStoredIssue(finding: BaselineFinding): StoredIssuePayload`
Converts BaselineFinding to the new storage format with pre-computed display values.

#### `getOptimizedFindings(): BaselineFinding[]`
Returns findings in a format optimized for transformation (future enhancement hook).

### In `dataTransformation.ts`

#### `buildIssuePayloadFromStored(stored: StoredIssuePayload, selected: boolean): IssuePayload`
Creates IssuePayload directly from stored data with minimal transformation.

## Modified Methods

### `restoreLatestScanFromDisk()`
- Now attempts to parse new format first
- Falls back to legacy format for backward compatibility
- No breaking changes to existing behavior

### `persistLatestScan()`
- Now saves data in the optimized `StoredScanPayload` format
- Includes pre-computed display values

## Backward Compatibility

- All legacy storage files (version 1) continue to work
- Automatic migration occurs on next scan
- No user action required
- No data loss during transition

## Performance Impact

### Before Optimization
```
Disk Storage → PersistedFinding → BaselineFinding → IssuePayload
     ↓              ↓                  ↓               ↓
 Simple data    Missing display    Full objects    UI ready
              values (requires    (more memory)     data
              computation)
```

### After Optimization
```
Disk Storage → StoredIssuePayload → BaselineFinding → IssuePayload
     ↓              ↓                    ↓               ↓
Pre-computed    Display ready       Full objects      UI ready
display data    (less computation)  (more memory)       data
```

### Future Potential
```
Disk Storage → StoredIssuePayload → IssuePayload
     ↓              ↓                    ↓
Pre-computed    Display ready         UI ready
display data    (minimal transform)     data
```

## Usage Examples

### Reading New Format
```typescript
const scan = this.parseStoredScan(diskData);
if (scan) {
  const findings = this.deserializeStoredIssues(scan.issues);
}
```

### Writing New Format
```typescript
const payload: StoredScanPayload = {
  version: 2,
  target: this.target,
  scannedAt: new Date().toISOString(),
  issues: this.findings.map(finding => this.serializeFindingToStoredIssue(finding))
};
```

### Direct Transformation
```typescript
const issuePayload = buildIssuePayloadFromStored(storedIssue, isSelected);
```