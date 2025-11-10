import type { Payload } from 'payload'

import { devUser } from './helpers/credentials.js'

export const seed = async (payload: Payload): Promise<boolean> => {
  payload.logger.info('Seeding data...')

  // Create dev user if not exists
  const { totalDocs } = await payload.count({
    collection: 'users',
    where: {
      email: {
        equals: devUser.email,
      },
    },
  })

  if (!totalDocs) {
    await payload.create({
      collection: 'users',
      data: devUser,
    })
    payload.logger.info('✅ Created dev user')
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
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  text: 'Detta är en exempelpost för att testa auto-översättning.',
                },
              ],
            },
          ],
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

  payload.logger.info('Seeding completed.')

  return true
}
