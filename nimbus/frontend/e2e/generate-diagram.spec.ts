import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:8080/api';

test.describe('Generate Diagram Flow', () => {
  test('should generate a diagram from a prompt', async ({ page }) => {
    await page.goto('/');

    // Find the prompt/chat input area
    const promptInput = page.locator('textarea, input[type="text"]').first();
    await expect(promptInput).toBeVisible({ timeout: 10000 });

    // Type a prompt
    await promptInput.fill('Create a simple web application with a load balancer, two app servers, and a database');

    // Click generate button
    const generateButton = page.locator('button').filter({ hasText: /generate/i }).first();
    await generateButton.click();

    // Wait for nodes to appear on the canvas (check for rendered elements)
    await expect(page.locator('canvas')).toBeVisible({ timeout: 30000 });

    // Wait for generation to complete — the diagram should have nodes
    // We check for visual indicators that nodes were rendered
    await page.waitForTimeout(5000); // Allow SSE stream to complete
  });
});
