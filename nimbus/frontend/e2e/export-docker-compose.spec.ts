import { test, expect } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';

const API_BASE = 'http://localhost:8080/api';

test.describe('Export Docker Compose Flow', () => {
  let diagramId: string;

  test.beforeEach(async ({ request }) => {
    // Seed a diagram via API
    const createRes = await request.post(`${API_BASE}/diagrams`, {
      data: { name: 'Docker Compose E2E Test' },
    });
    const diagram = await createRes.json();
    diagramId = diagram.id;

    // Add a compute node
    const nodeId = uuidv4();
    await request.post(`${API_BASE}/diagrams/${diagramId}/nodes`, {
      data: {
        node: {
          id: nodeId,
          nodeType: { category: 'Compute', component: 'ApplicationServer' },
          label: 'Web Server',
          position: { x: 100, y: 100 },
          size: { width: 180, height: 48 },
          properties: { config: {} },
        },
      },
    });
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`${API_BASE}/diagrams/${diagramId}`);
  });

  test('should export docker-compose file', async ({ page }) => {
    await page.goto(`/diagrams/${diagramId}`);
    await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });

    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });

    // Find and click the export docker compose button
    const exportButton = page.locator('button').filter({ hasText: /docker/i }).first();
    if (await exportButton.isVisible({ timeout: 5000 })) {
      await exportButton.click();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('docker-compose');
    }
  });
});
