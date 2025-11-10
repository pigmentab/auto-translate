/**
 * Test script to demonstrate translation optimization
 * Run with: node optimization-test.js
 */

// Sample data from user (exactly as provided)
const sampleData = {
  title: 'Arkiv: Lisa Ekdahl - Vem vet 25',
  eventImage: '690d99edec1e4704fe64c02a',
  eventContent: {
    root: {
      children: [
        {
          children: [
            {
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text: ' ',
              type: 'text',
              version: 1,
            },
          ],
          direction: null,
          format: '',
          indent: 0,
          type: 'paragraph',
          version: 1,
          textFormat: 0,
          textStyle: '',
        },
      ],
      direction: null,
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  },
  eventDates: [
    {
      dateTime: '2019-05-05T17:00:00.000Z',
      bookingLink:
        'https://www.ticketmaster.se/event/531889?brand=se_cirkus&CAMEFROM=580Cirkus',
    },
  ],
  location: '690d9af7ec1e4704fe64ccee',
  organizer: {
    name: 'Live Nation',
    url: null,
  },
  importedFromWordpress: true,
  slug: 'lisa-ekdahl-vem-vet-25',
  eventSidebar: {
    dataList: [
      {
        title: 'Organizer',
        content: {
          root: {
            children: [
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: 'Live Nation',
                    type: 'text',
                    version: 1,
                  },
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1,
                textFormat: 0,
                textStyle: '',
              },
            ],
            direction: null,
            format: '',
            indent: 0,
            type: 'root',
            version: 1,
          },
        },
        rowWidth: '100%',
      },
      {
        title: 'Ticket office',
        content: {
          root: {
            children: [
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: 'Öppnar 2h innan',
                    type: 'text',
                    version: 1,
                  },
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1,
                textFormat: 0,
                textStyle: '',
              },
            ],
            direction: null,
            format: '',
            indent: 0,
            type: 'root',
            version: 1,
          },
        },
        rowWidth: '100%',
      },
      {
        title: 'Bar & Restaurant',
        content: {
          root: {
            children: [
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: 'Öppen från 17:00',
                    type: 'text',
                    version: 1,
                  },
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1,
                textFormat: 0,
                textStyle: '',
              },
            ],
            direction: null,
            format: '',
            indent: 0,
            type: 'root',
            version: 1,
          },
        },
        rowWidth: '100%',
      },
      {
        title: 'PLAYTIME',
        content: {
          root: {
            children: [
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: 'Ca 90 minuter',
                    type: 'text',
                    version: 1,
                  },
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1,
                textFormat: 0,
                textStyle: '',
              },
            ],
            direction: null,
            format: '',
            indent: 0,
            type: 'root',
            version: 1,
          },
        },
        rowWidth: '100%',
      },
      {
        title: 'Age rating',
        content: {
          root: {
            children: [
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: 'Ingen åldersgräns',
                    type: 'text',
                    version: 1,
                  },
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1,
                textFormat: 0,
                textStyle: '',
              },
            ],
            direction: null,
            format: '',
            indent: 0,
            type: 'root',
            version: 1,
          },
        },
        rowWidth: '100%',
      },
    ],
  },
  category: ['690d9afeec1e4704fe64cd67'],
  _status: 'published',
  meta: {
    title: '',
    description: '',
    image: '690d99edec1e4704fe64c02a',
  },
  wordpressData: {
    id: '143',
    date: '2019-01-31 12:05:04',
    modified: '2024-12-02 10:01:40',
    content:
      'Visklassikern "Vem Vet" fyller 25. Detta firar Lisa Ekdahl med en stor jubileumsturné där hon spelar hela den legendariska debuten – från början till slut – och även låtar från det nya albumet "More of the good". Vilka nya låtar det blir kommer att avgöras med hjälp av ett klassiskt lyckohjul.',
    excerpt:
      'Visklassikern "Vem Vet" fyller 25. Detta firar Lisa Ekdahl med en stor jubileumsturné där hon spelar hela den legendariska debuten – från början till slut – och även låtar från det nya albumet "More of the good". Vilka nya låtar det blir kommer att avgöras med hjälp av ett klassiskt lyckohjul.',
    permalink: 'https://cirkus.se/sv/events/lisa-ekdahl-vem-vet-25/',
    eventImage: '/wp-content/uploads/2019/01/lisa-ekdahl.jpg',
  },
}

// Mock extraction logic (simplified version of the service)
function extractTranslatableStrings(data, path = '') {
  const strings = new Map()

  function extract(obj, currentPath) {
    if (obj === null || obj === undefined) {
      return obj
    }

    // Handle lexical editor format
    if (isLexicalEditorNode(obj)) {
      return extractFromLexicalNode(obj, currentPath, strings)
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map((item, index) => extract(item, `${currentPath}[${index}]`))
    }

    // Handle objects
    if (typeof obj === 'object') {
      const result = {}
      for (const [key, value] of Object.entries(obj)) {
        const newPath = currentPath ? `${currentPath}.${key}` : key
        result[key] = extract(value, newPath)
      }
      return result
    }

    // Handle strings
    if (typeof obj === 'string' && obj.trim().length > 0) {
      if (!shouldSkipString(obj, currentPath)) {
        strings.set(currentPath, obj)
        return `__TRANSLATE_${currentPath}__`
      }
    }

    return obj
  }

  const metadata = extract(data, path)
  return { metadata, strings }
}

function isLexicalEditorNode(obj) {
  return (
    obj &&
    typeof obj === 'object' &&
    'type' in obj &&
    'version' in obj &&
    ('children' in obj || 'text' in obj)
  )
}

function extractFromLexicalNode(node, path, strings) {
  // Handle text nodes
  if (node.type === 'text' && node.text && node.text.trim().length > 0) {
    const textPath = `${path}.text`
    strings.set(textPath, node.text)
    return { ...node, text: `__TRANSLATE_${textPath}__` }
  }

  // Handle nodes with children
  if (node.children && Array.isArray(node.children)) {
    return {
      ...node,
      children: node.children.map((child, index) =>
        extractFromLexicalNode(child, `${path}.children[${index}]`, strings),
      ),
    }
  }

  return node
}

function shouldSkipString(str, path) {
  // Skip IDs (MongoDB ObjectIds)
  if (/^[a-f0-9]{24}$/i.test(str)) {
    return true
  }

  // Skip URLs
  if (/^https?:\/\//.test(str)) {
    return true
  }

  // Skip file paths
  if (/^\/[^\s]*\.(jpg|jpeg|png|gif|webp|svg|pdf|mp4|webm|ogg|mp3|wav)$/i.test(str)) {
    return true
  }

  // Skip email addresses
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
    return true
  }

  // Skip ISO date strings
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str)) {
    return true
  }

  // Skip date-time strings like "2019-01-31 12:05:04"
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str)) {
    return true
  }

  // Skip percentages like "100%"
  if (/^\d+%$/.test(str)) {
    return true
  }

  // Skip pure numbers
  if (/^\d+$/.test(str)) {
    return true
  }

  // Skip very short strings
  if (str.trim().length <= 1) {
    return true
  }

  // Skip status values
  if (['published', 'draft', 'archived', 'pending'].includes(str.toLowerCase())) {
    return true
  }

  // Skip paths ending with id, createdAt, updatedAt, etc.
  const pathLower = path.toLowerCase()
  if (
    pathLower.endsWith('id') ||
    pathLower.endsWith('_id') ||
    pathLower.includes('createdat') ||
    pathLower.includes('updatedat')
  ) {
    return true
  }

  return false
}

// Run the test
console.log('🧪 Translation Optimization Test\n')
console.log('=' .repeat(80))

const originalSize = JSON.stringify(sampleData).length
console.log(`📦 Original JSON size: ${originalSize.toLocaleString()} bytes`)

const { metadata, strings } = extractTranslatableStrings(sampleData)

// Create simple object with just the strings
const stringsToTranslate = {}
strings.forEach((value, key) => {
  stringsToTranslate[key] = value
})

const optimizedSize = JSON.stringify(stringsToTranslate).length
const reduction = ((1 - optimizedSize / originalSize) * 100).toFixed(1)

console.log(`📦 Optimized JSON size: ${optimizedSize.toLocaleString()} bytes`)
console.log(`✨ Size reduction: ${reduction}%`)
console.log(`\n📝 Translatable strings found: ${strings.size}`)

console.log('\n' + '=' .repeat(80))
console.log('Extracted translatable strings:\n')

let count = 1
strings.forEach((value, key) => {
  console.log(`${count}. [${key}]`)
  console.log(`   "${value}"`)
  count++
})

console.log('\n' + '=' .repeat(80))
console.log('\n✅ Summary:')
console.log(`   • Reduced payload from ${originalSize} to ${optimizedSize} bytes`)
console.log(`   • ${reduction}% smaller = ${reduction}% faster processing`)
console.log(`   • Only ${strings.size} strings need translation`)
console.log(
  `   • Skipped all metadata (type, version, format, etc.) and IDs\n`,
)

