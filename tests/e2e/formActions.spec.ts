import path from 'node:path';
import { test, expect } from '@playwright/test';
import {
  addTags,
  clickButton,
  fillContentEditable,
  fillInput,
  fillTextarea,
  selectOption,
  waitForSuccess,
} from '../../lib/playwright/actions';

const FIXTURE_URL = 'file://' + path.resolve(__dirname, 'fixtures/mock-submission-form.html');

test.describe('Playwright form-fill helpers against a local mock page', () => {
  test('navigates to the fixture and finds the expected fields', async ({ page }) => {
    await page.goto(FIXTURE_URL);
    await expect(page.locator('#title')).toHaveCount(1);
    await expect(page.locator('#submit-button')).toHaveCount(1);
  });

  test('fills a plain input and a textarea', async ({ page }) => {
    await page.goto(FIXTURE_URL);
    const titleFilled = await fillInput(page, '#title', 'Solar hits Kisumu');
    const bodyFilled = await fillTextarea(page, '#body', 'The full story text.');

    expect(titleFilled).toBe(true);
    expect(bodyFilled).toBe(true);
    await expect(page.locator('#title')).toHaveValue('Solar hits Kisumu');
    await expect(page.locator('#body')).toHaveValue('The full story text.');
  });

  test('returns false rather than throwing when a selector is missing', async ({ page }) => {
    await page.goto(FIXTURE_URL);
    const result = await fillInput(page, '#does-not-exist', 'anything');
    expect(result).toBe(false);
  });

  test('fills a contenteditable rich-text field', async ({ page }) => {
    await page.goto(FIXTURE_URL);
    const filled = await fillContentEditable(page, '#rich-body', 'Rich body content');
    expect(filled).toBe(true);
    await expect(page.locator('#rich-body')).toHaveText('Rich body content');
  });

  test('selects a category option by label', async ({ page }) => {
    await page.goto(FIXTURE_URL);
    const selected = await selectOption(page, '#category', 'Energy');
    expect(selected).toBe(true);
    await expect(page.locator('#category')).toHaveValue('energy');
  });

  test('types tags into a tags field', async ({ page }) => {
    await page.goto(FIXTURE_URL);
    const added = await addTags(page, '#tags', ['solar', 'kenya']);
    expect(added).toBe(true);
    const value = await page.locator('#tags').inputValue();
    expect(value).toContain('solar');
    expect(value).toContain('kenya');
  });

  test('clicks submit and detects success via a URL pattern', async ({ page }) => {
    await page.goto(FIXTURE_URL);
    await fillInput(page, '#title', 'Solar hits Kisumu');
    const startUrl = page.url();

    const clicked = await clickButton(page, '#submit-button');
    expect(clicked).toBe(true);

    const outcome = await waitForSuccess(page, { successUrlPattern: 'published=1', startUrl });
    expect(outcome.succeeded).toBe(true);
    expect(outcome.confident).toBe(true);
    expect(outcome.publishedUrl).toContain('mock-success.html');
  });

  test('clicks submit and detects success via a success selector', async ({ page }) => {
    await page.goto(FIXTURE_URL);
    const startUrl = page.url();
    await clickButton(page, '#submit-button');

    const outcome = await waitForSuccess(page, { successSelector: '#success-banner', startUrl });
    expect(outcome.succeeded).toBe(true);
    expect(outcome.confident).toBe(true);
  });

  test('reports an unconfident (but not falsely confirmed) result when nothing changes', async ({ page }) => {
    await page.goto(FIXTURE_URL);
    const startUrl = page.url();
    // Nothing is clicked — the page never navigates.
    const outcome = await waitForSuccess(page, { startUrl });
    expect(outcome.succeeded).toBe(false);
    expect(outcome.confident).toBe(false);
  });
});
