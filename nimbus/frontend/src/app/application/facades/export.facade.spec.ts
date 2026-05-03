import { ExportFacade } from './export.facade';
import { ApiGateway, TerraformFiles } from '../../infrastructure/gateways/api.gateway';

describe('ExportFacade', () => {
  let facade: ExportFacade;
  let mockApiGateway: jest.Mocked<ApiGateway>;
  let clickSpy: jest.Mock;

  beforeEach(() => {
    mockApiGateway = {
      exportTerraform: jest.fn(),
      exportDockerCompose: jest.fn(),
    } as unknown as jest.Mocked<ApiGateway>;

    facade = new ExportFacade(mockApiGateway);

    clickSpy = jest.fn();
    jest.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: clickSpy,
    } as unknown as HTMLAnchorElement);
    jest.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    jest.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
    (global as any).URL.createObjectURL = jest.fn().mockReturnValue('blob:test');
    (global as any).URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should export terraform as zip', async () => {
    const mockFiles: TerraformFiles = {
      providers_tf: 'provider "aws" {}',
      main_tf: 'resource "aws_instance" "web" {}',
      variables_tf: 'variable "region" {}',
      outputs_tf: 'output "web_id" {}',
    };
    mockApiGateway.exportTerraform.mockResolvedValue(mockFiles);

    await facade.exportTerraform('test-id', 'my-project');

    expect(mockApiGateway.exportTerraform).toHaveBeenCalledWith('test-id');
    expect(clickSpy).toHaveBeenCalled();
  });

  test('should export docker compose as yaml', async () => {
    const mockBlob = new Blob(['version: "3.8"'], { type: 'application/x-yaml' });
    mockApiGateway.exportDockerCompose.mockResolvedValue(mockBlob);

    await facade.exportDockerCompose('test-id', 'my-project');

    expect(mockApiGateway.exportDockerCompose).toHaveBeenCalledWith('test-id');
    expect(clickSpy).toHaveBeenCalled();
  });
});
