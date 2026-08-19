import type { Payload } from 'payload'

import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

let payload: Payload

afterAll(async () => {
  await payload.destroy()
})

beforeAll(async () => {
  payload = await getPayload({ config })
})

describe('Auto-Translate plugin integration tests', () => {
  test('translation-exclusions collection is registered', () => {
    expect(payload.collections['translation-exclusions']).toBeDefined()
  })

  test('translation-settings global is registered', () => {
    const settingsGlobal = payload.globals.config.find(
      (g) => g.slug === 'translation-settings',
    )
    expect(settingsGlobal).toBeDefined()
  })

  test('posts collection has translationSync field', () => {
    const postsCollection = payload.config.collections.find((c) => c.slug === 'posts')
    expect(postsCollection).toBeDefined()
    const syncField = postsCollection?.fields.find(
      (f) => 'name' in f && f.name === 'translationSync',
    )
    expect(syncField).toBeDefined()
  })

  test('can create a post in the default locale', async () => {
    const post = await payload.create({
      collection: 'posts',
      data: {
        title: 'Integration test post',
        description: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                version: 1,
                children: [
                  {
                    text: 'Integration test description.',
                    type: 'text',
                    version: 1,
                  },
                ],
              },
            ],
            direction: null,
            format: '',
            indent: 0,
            version: 1,
          },
        },
        translationSync: false,
      },
      locale: 'sv',
    })
    expect(post.id).toBeDefined()
    expect(post.title).toBe('Integration test post')

    // Clean up
    await payload.delete({ collection: 'posts', id: post.id })
  })
})
