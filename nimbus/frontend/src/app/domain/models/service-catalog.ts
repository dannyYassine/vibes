import { NodeCategory } from './node.model';

export const SERVICE_CATALOG: Record<NodeCategory, string[]> = {
  Compute: ['ApplicationServer', 'Worker', 'Function', 'Container', 'VirtualMachine', 'Scheduler'],
  Networking: ['LoadBalancer', 'ApiGateway', 'Cdn', 'Dns', 'Firewall', 'Vpn', 'ServiceMesh', 'ReverseProxy'],
  Data: ['RelationalDb', 'DocumentDb', 'KeyValueStore', 'GraphDb', 'DataWarehouse', 'SearchEngine', 'TimeSeriesDb'],
  Caching: ['Cache', 'SessionStore'],
  Messaging: ['MessageQueue', 'EventBus', 'PubSub', 'StreamProcessor', 'JobBroker'],
  Storage: ['ObjectStorage', 'BlockStorage', 'FileStorage'],
  Security: ['IdentityProvider', 'SecretManager', 'CertificateManager', 'Waf'],
  Observability: ['Logging', 'Monitoring', 'Tracing', 'Alerting'],
  Group: ['NetworkBoundary', 'AvailabilityZone', 'Region', 'ServiceCluster', 'Custom'],
};

export const CATEGORY_COLORS: Record<NodeCategory, string> = {
  Compute: '#89b4fa',
  Networking: '#a6e3a1',
  Data: '#cba6f7',
  Caching: '#fab387',
  Messaging: '#f9e2af',
  Storage: '#94e2d5',
  Security: '#f38ba8',
  Observability: '#89dceb',
  Group: '#6c7086',
};
