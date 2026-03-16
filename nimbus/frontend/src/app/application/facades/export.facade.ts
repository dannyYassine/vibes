import { Injectable } from '@angular/core';
import { Diagram } from '../../domain/models/diagram.model';

@Injectable({ providedIn: 'root' })
export class ExportFacade {
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
}
