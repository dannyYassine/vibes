import { CloudProvider, Diagram } from '../models';

export interface TerraformExportResponse {
  files: TerraformFile[];
}

export interface TerraformFile {
  filename: string;
  content: string;
}

export interface TranslationProvider {
  translate(diagramId: string, provider: CloudProvider): Promise<Diagram>;
  clearTranslation(diagramId: string): Promise<Diagram>;
  exportTerraform(diagramId: string): Promise<TerraformExportResponse>;
}
