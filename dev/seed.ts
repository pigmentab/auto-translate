import type { Payload } from 'payload'

import { devUser } from './helpers/credentials.js'

export const seed = async (payload: Payload): Promise<boolean> => {
  payload.logger.info('Seeding data...')

  // Create dev user if not exists
  const { totalDocs: userCount } = await payload.count({
    collection: 'users',
    where: {
      email: {
        equals: devUser.email,
      },
    },
  })

  if (!userCount) {
    await payload.create({
      collection: 'users',
      data: devUser,
    })
    payload.logger.info('✅ Created dev user')
  } else {
    payload.logger.info('ℹ️  Dev user already exists')
  }

  // Check if test posts already exist
  const { totalDocs: postCount } = await payload.count({
    collection: 'posts',
  })

  if (postCount > 0) {
    payload.logger.info(`ℹ️  Database already contains ${postCount} post(s) - skipping seed`)
    payload.logger.info('💡 To re-seed, delete all posts first or run seed manually')
    return false
  }

  // Create a test post in Swedish (default language)
  const testPost = await payload.create({
    collection: 'posts',
    data: {
      content: [
        {
          title: 'Introduktion',
        },
      ],
      description: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  text: 'Detta är en exempelpost för att testa auto-översättning.',
                  type: 'text',
                },
              ],
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
        },
      },
      title: 'Välkommen till vår blogg',
      translationSync: true,
    },
    locale: 'sv',
  })

  payload.logger.info(`✅ Created test post: ${testPost.id}`)
  payload.logger.info('🌐 Auto-translation should have created English version')

  // Verify English version was created
  try {
    const englishPost = await payload.findByID({
      id: testPost.id,
      collection: 'posts',
      fallbackLocale: false,
      locale: 'en',
    })

    payload.logger.info(`✅ English version found: "${englishPost.title}"`)
  } catch (error) {
    payload.logger.error('❌ English version not found - check OPENAI_API_KEY')
  }

  payload.logger.info('✨ Seeding completed.')

  return true
}
