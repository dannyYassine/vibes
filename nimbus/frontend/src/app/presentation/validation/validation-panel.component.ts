import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ValidationFacade } from '../../application/facades/validation.facade';
import { AiFacade } from '../../application/facades/ai.facade';
import { DiagramFacade } from '../../application/facades/diagram.facade';
import { ValidationWarning, ValidationSeverity } from '../../domain/models/validation.model';

const SEVERITY_COLORS: Record<ValidationSeverity, string> = {
  Error: '#f38ba8',
  Warning: '#f9e2af',
  Info: '#89b4fa',
};

const RULE_LABELS: Record<string, string> = {
  ORPHAN_NODE: 'Orphan Node',
  MISSING_EDGE_TARGET: 'Missing Edge Target',
  DUPLICATE_EDGE: 'Duplicate Edge',
  SELF_REFERENCING_EDGE: 'Self-Referencing Edge',
  DISCONNECTED_SUBGRAPH: 'Disconnected Subgraph',
  MISSING_SECURITY: 'Missing Security',
  MISSING_OBSERVABILITY: 'Missing Observability',
  SINGLE_AZ: 'Single Availability Zone',
  NO_CACHING: 'No Caching',
  CIRCULAR_DEPENDENCY: 'Circular Dependency',
};

@Component({
  selector: 'app-validation-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (validationFacade.validationResult$ | async; as result) {
      <div class="validation-panel">
        <div class="panel-header">
          <span>Validation</span>
          <span class="badge" [class.valid]="result.valid" [class.invalid]="!result.valid">
            {{ result.warnings.length }}
          </span>
        </div>
        <div class="warnings-list">
          @for (warning of result.warnings; track warning.id) {
            <div class="warning-item" (click)="onWarningClick(warning)">
              <div class="warning-header">
                <span class="severity-dot" [style.background]="getSeverityColor(warning.severity)"></span>
                <span class="rule-name">{{ getRuleLabel(warning.rule) }}</span>
                <span class="severity-label" [style.color]="getSeverityColor(warning.severity)">{{ warning.severity }}</span>
              </div>
              <div class="warning-message">{{ warning.message }}</div>
              <button class="fix-btn" (click)="onFix(warning, $event)">Fix with AI</button>
            </div>
          }
          @if (result.warnings.length === 0) {
            <div class="no-warnings">No warnings found.</div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .validation-panel {
      background: #1e1e2e;
      color: #cdd6f4;
      border-top: 1px solid #313244;
    }
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      font-weight: 600;
      font-size: 13px;
      border-bottom: 1px solid #313244;
      color: #cba6f7;
    }
    .badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: 600;
    }
    .badge.valid { background: #a6e3a1; color: #1e1e2e; }
    .badge.invalid { background: #f38ba8; color: #1e1e2e; }
    .warnings-list {
      max-height: 200px;
      overflow-y: auto;
    }
    .warning-item {
      padding: 10px 16px;
      border-bottom: 1px solid #313244;
      cursor: pointer;
    }
    .warning-item:hover { background: #181825; }
    .warning-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .severity-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .rule-name {
      font-size: 12px;
      font-weight: 600;
      flex: 1;
    }
    .severity-label {
      font-size: 11px;
      font-weight: 500;
    }
    .warning-message {
      font-size: 12px;
      color: #a6adc8;
      margin-bottom: 6px;
      padding-left: 16px;
    }
    .fix-btn {
      font-size: 11px;
      padding: 3px 10px;
      border: 1px solid #cba6f7;
      border-radius: 4px;
      background: transparent;
      color: #cba6f7;
      cursor: pointer;
      margin-left: 16px;
    }
    .fix-btn:hover { background: rgba(203, 166, 247, 0.15); }
    .no-warnings {
      padding: 16px;
      text-align: center;
      color: #a6e3a1;
      font-size: 13px;
    }
  `],
})
export class ValidationPanelComponent {
  constructor(
    public validationFacade: ValidationFacade,
    private aiFacade: AiFacade,
    private diagramFacade: DiagramFacade,
  ) {}

  getSeverityColor(severity: ValidationSeverity): string {
    return SEVERITY_COLORS[severity] || '#a6adc8';
  }

  getRuleLabel(rule: string): string {
    return RULE_LABELS[rule] || rule;
  }

  onWarningClick(warning: ValidationWarning): void {
    if (warning.nodeIds.length > 0) {
      this.diagramFacade.selectNodes(warning.nodeIds);
    }
  }

  onFix(warning: ValidationWarning, event: Event): void {
    event.stopPropagation();
    const diagramId = this.diagramFacade.getCurrentDiagramId();
    if (diagramId) {
      this.aiFacade.fixWarning(diagramId, warning.id, warning.rule, warning.message);
    }
  }
}
