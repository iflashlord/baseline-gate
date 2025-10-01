export function getAnalysisViewBody(): string {
  return `
    <a href="#main-content" class="skip-to-content">Skip to main content</a>
    <div class="view">
      <div class="controls">
        <button class="primary" data-action="scan">Scan workspace</button>
      </div>
      <details class="filter-panel" data-filter-panel>
        <summary aria-controls="filters-content" aria-expanded="false">
          <span class="filter-summary-content">
            <span class="filter-summary-title">Filter and sort</span>
            <span class="filter-summary-status" data-filter-summary aria-live="polite">Default view</span>
          </span>
          <span class="filter-summary-icon" aria-hidden="true"></span>
        </summary>
        <div class="filter-content" id="filters-content">
          <div class="filters">
            <div class="search-box">
              <input type="search" placeholder="Search findings" data-search />
            </div>
            <div class="severity-filter" data-severity>
              <label data-verdict="blocked"><input type="checkbox" value="blocked" />Blocked</label>
              <label data-verdict="warning"><input type="checkbox" value="warning" />Needs review</label>
              <label data-verdict="safe"><input type="checkbox" value="safe" />Safe</label>
            </div>
            <div class="filter-actions">
              <label class="sort-select">
                <span>Sort by</span>
                <select data-sort>
                  <option value="severity">Severity (blocked first)</option>
                  <option value="file">File path</option>
                </select>
              </label>
              <div class="grouping-toggle">
                <label>
                  <input type="checkbox" data-group-similar />
                  <span class="toggle-visual" aria-hidden="true"></span>
                  <span>Group similar issues</span>
                </label>
              </div>
              <button type="button" data-action="clear-filters">Clear filters</button>
            </div>
          </div>
        </div>
      </details>
      <div class="summary" data-summary></div>
      <div class="content">
        <div class="results" data-results id="main-content"></div>
        <aside class="detail hidden" data-detail>
          <div class="detail-resize-handle" data-resize-handle></div>
          <div class="detail-content">
            <div class="detail-pane">
              <div class="detail-top">
                <div>
                  <div class="detail-heading" data-detail-title></div>
                  <div class="detail-subheading hidden" data-detail-subtitle></div>
                </div>
                <button class="detail-close" data-detail-close title="Close details" aria-label="Close details">×</button>
              </div>
              <div class="detail-path" data-detail-path></div>
              <div class="detail-body" data-detail-body></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
    <div class="insights-backdrop hidden" data-insights-backdrop></div>
    <aside class="insights-panel hidden" data-insights-panel aria-hidden="true">
      <header class="insights-header">
        <h2>Baseline Insights</h2>
        <button class="insights-close" type="button" title="Close insights" aria-label="Close insights" data-insights-close>×</button>
      </header>
      <div class="insights-content">
        <section class="insights" data-insights>
          <article class="chart-card" data-history-card>
            <div class="chart-title">Trend history <span>(scan baseline)</span></div>
            <div class="chart-body">
              <svg class="chart-svg" viewBox="0 0 240 70" role="img" aria-label="Baseline scan history" data-history-chart></svg>
            </div>
            <p class="chart-caption" data-history-caption>Run a scan to build history.</p>
          </article>
          <article class="chart-card" data-stats-card>
            <div class="chart-title">Feature group focus <span>(top offenders)</span></div>
            <div class="chart-body" data-stats-bars>
              <p class="chart-empty">No findings yet.</p>
            </div>
            <p class="chart-caption" data-stats-caption></p>
          </article>
          <article class="chart-card" data-budget-card>
            <div class="chart-title">Baseline budgets <span>(targets)</span></div>
            <div class="chart-body">
              <div class="budget-grid" data-budget-grid>
                <p class="chart-empty">No budgets configured.</p>
              </div>
            </div>
            <p class="chart-caption" data-budget-caption></p>
          </article>
        </section>
      </div>
    </aside>
    
  `.trim();
}
