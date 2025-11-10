// Test: Verify autosave doesn't trigger translation
// Description: This test verifies that when drafts with autosave are enabled,
// translations only trigger on publish, not on autosave operations.

import { expect, test } from '@playwright/test'

test.describe('Drafts & Autosave Translation Behavior', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin panel and login
    await page.goto('http://localhost:3000/admin')
    // Add login steps here if needed
  })

  test('should NOT trigger translation on autosave', async ({ page, context }) => {
    // Navigate to posts collection
    await page.goto('http://localhost:3000/admin/collections/posts')

    // Create new post
    await page.click('text=Create New')

    // Fill in title (in default locale - Swedish)
    await page.fill('input[name="title"]', 'Test autosave beteende')

    // Fill in description
    await page.fill('[data-field-path="description"]', 'Detta är ett test för att verifiera att översättningar inte körs vid autosave.')

    // Wait for autosave to trigger (usually after a few seconds)
    await page.waitForTimeout(5000)

    // Check console logs - should see "Skipping translation - document is a draft"
    const logs = []
    page.on('console', msg => {
      if (msg.text().includes('Auto-Translate')) {
        logs.push(msg.text())
      }
    })

    // Verify that translation was NOT triggered
    const translationSkipped = logs.some(log =>
      log.includes('Skipping translation - document is a draft')
    )
    expect(translationSkipped).toBeTruthy()

    // Verify translation was NOT triggered for secondary locales
    const translationTriggered = logs.some(log =>
      log.includes('Processing posts document') ||
      log.includes('Translating posts:')
    )
    expect(translationTriggered).toBeFalsy()
  })

  test('should trigger translation on publish', async ({ page, context }) => {
    // Navigate to posts collection
    await page.goto('http://localhost:3000/admin/collections/posts')

    // Create new post
    await page.click('text=Create New')

    // Fill in title (in default locale - Swedish)
    await page.fill('input[name="title"]', 'Test publicering')

    // Fill in description
    await page.fill('[data-field-path="description"]', 'Detta är ett test för att verifiera att översättningar körs vid publicering.')

    // Enable translation sync
    await page.check('input[name="translationSync"]')

    // Capture console logs
    const logs = []
    page.on('console', msg => {
      if (msg.text().includes('Auto-Translate')) {
        logs.push(msg.text())
      }
    })

    // Click publish button
    await page.click('button:has-text("Save")')

    // Wait for save operation
    await page.waitForTimeout(2000)

    // Verify that translation WAS triggered
    const translationTriggered = logs.some(log =>
      log.includes('Processing posts document') ||
      log.includes('Translating posts:')
    )
    expect(translationTriggered).toBeTruthy()

    // Switch to English locale
    await page.selectOption('select[name="locale"]', 'en')

    // Wait for page to load
    await page.waitForTimeout(1000)

    // Verify title was translated
    const englishTitle = await page.inputValue('input[name="title"]')
    expect(englishTitle).not.toBe('Test publicering')
    expect(englishTitle.length).toBeGreaterThan(0)
  })

  test('should handle collections without drafts normally', async ({ page }) => {
    // Test with a collection that doesn't have drafts enabled
    // Should trigger translation on every save
    // Implementation depends on your test collections
  })

  test('should show correct debug messages', async ({ page }) => {
    const logs = []
    page.on('console', msg => {
      if (msg.text().includes('Auto-Translate')) {
        logs.push(msg.text())
      }
    })

    // Create and save draft
    await page.goto('http://localhost:3000/admin/collections/posts/create')
    await page.fill('input[name="title"]', 'Debug test')
    await page.waitForTimeout(5000) // Wait for autosave

    // Check debug logs
    const draftLog = logs.find(log =>
      log.includes('Skipping translation - document is a draft')
    )
    expect(draftLog).toBeTruthy()
    expect(draftLog).toMatch(/status: draft/)

    // Now publish
    await page.click('button:has-text("Save")')
    await page.waitForTimeout(2000)

    // Check that translation was processed
    const publishLog = logs.find(log =>
      log.includes('Processing posts document')
    )
    expect(publishLog).toBeTruthy()
  })
})

// Manual Testing Steps
/*
1. Start dev server:
   $ pnpm dev

2. Enable debugging in dev/payload.config.ts:
   autoTranslate({
     debugging: true,
     // ... other config
   })

3. Open browser to http://localhost:3000/admin

4. Create new post:
   - Click "Posts" in sidebar
   - Click "Create New"
   - Enter title in Swedish: "Testartikel om katter"
   - Enter description: "Detta är en artikel om katter och deras beteende."
   - Enable "Enable Auto-Translation"

5. Wait for autosave (watch browser console):
   - You should see: "Skipping translation - document is a draft (status: draft)"
   - You should NOT see: "Processing posts document" or "Translating posts:"

6. Click "Save & Publish" button:
   - Now you SHOULD see: "Processing posts document update: [id]"
   - Followed by: "Translating posts:[id] from sv to en"
   - And: "Translating posts:[id] from sv to de"
   - Finally: "Successfully translated posts:[id] to en" (and de)

7. Verify translations:
   - Switch locale dropdown to "English"
   - Title should be translated: "Test article about cats"
   - Description should be translated

8. Test draft editing:
   - Make changes to the English version
   - Wait for autosave
   - Should see: "Skipping translation - not default locale (current: en, default: sv)"
   - Switch back to Swedish
   - Make changes
   - Wait for autosave
   - Should see: "Skipping translation - document is a draft"
   - Click "Publish Changes"
   - Should see translation logs again

Expected Console Output (with debugging: true):

For Autosave:
✅ [Auto-Translate Plugin] Skipping translation - document is a draft (status: draft)

For Publish:
✅ [Auto-Translate Plugin] Processing posts document update: 67269f52c80f6e9c8e03e7e2
✅ [Auto-Translate Plugin] Translating posts:67269f52c80f6e9c8e03e7e2 from sv to en
✅ [Auto-Translate Plugin] Excluded paths for en:
✅ [Auto-Translate Plugin] Successfully translated posts:67269f52c80f6e9c8e03e7e2 to en
✅ [Auto-Translate Plugin] Translating posts:67269f52c80f6e9c8e03e7e2 from sv to de
✅ [Auto-Translate Plugin] Successfully translated posts:67269f52c80f6e9c8e03e7e2 to de
*/

