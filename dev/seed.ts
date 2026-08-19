import type { Payload } from 'payload'

import { devUser } from './helpers/credentials'

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
              version: 1,
              children: [
                {
                  text: 'Detta är en exempelpost för att testa auto-översättning.',
                  type: 'text',
                  version: 1,
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

  // Seed pages for nested-docs + auto-translate compatibility test
  const { totalDocs: pageCount } = await payload.count({
    collection: 'pages',
  })

  if (pageCount === 0) {
    // Parent page
    const parentPage = await payload.create({
      collection: 'pages',
      data: {
        title: 'Föräldrasida',
        slug: 'foraldrasida',
        translationSync: true,
      },
      locale: 'sv',
    })
    payload.logger.info(`✅ Created parent page: ${parentPage.id}`)

    // Child page – triggers resaveChildren on the parent, exercising the nested-docs path
    await payload.create({
      collection: 'pages',
      data: {
        title: 'Barnsida',
        slug: 'barnsida',
        parent: parentPage.id,
        translationSync: true,
      },
      locale: 'sv',
    })
    payload.logger.info('✅ Created child page (nested-docs test)')
  } else {
    payload.logger.info(`ℹ️  Pages already seeded (${pageCount} found) - skipping`)
  }

  payload.logger.info('✨ Seeding completed.')

  return true
}
