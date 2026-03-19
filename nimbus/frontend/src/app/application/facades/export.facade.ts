import { Injectable } from '@angular/core';
import { Diagram } from '../../domain/models/diagram.model';
import { ApiGateway } from '../../infrastructure/gateways/api.gateway';
import JSZip from 'jszip';

@Injectable({ providedIn: 'root' })
export class ExportFacade {
  constructor(private apiGateway: ApiGateway) {}

  exportPng(canvas: HTMLCanvasElement, diagramName: string): void {
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${diagramName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  exportJson(diagram: Diagram): void {
    const json = JSON.stringify(diagram, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${diagram.name}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  importJson(file: File): Promise<Diagram> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string);
          if (!parsed.name || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges) || !parsed.viewport) {
            reject(new Error('Invalid diagram JSON: missing required fields'));
            return;
          }
          resolve(parsed as Diagram);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  async exportTerraform(diagramId: string, diagramName: string): Promise<void> {
    const files = await this.apiGateway.exportTerraform(diagramId);
    const zip = new JSZip();
    zip.file('providers.tf', files.providers_tf);
    zip.file('main.tf', files.main_tf);
    zip.file('variables.tf', files.variables_tf);
    zip.file('outputs.tf', files.outputs_tf);
    const blob = await zip.generateAsync({ type: 'blob' });
    this.triggerDownload(blob, `${diagramName}-terraform.zip`);
  }

  async exportDockerCompose(diagramId: string, diagramName: string): Promise<void> {
    const blob = await this.apiGateway.exportDockerCompose(diagramId);
    this.triggerDownload(blob, `${diagramName}-docker-compose.yml`);
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
