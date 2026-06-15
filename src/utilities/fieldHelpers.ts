import type { Field } from 'payload'

import type { FieldPath } from '../types/index.js'

/**
 * Field types whose stored value is an option/enum constant rather than
 * human-readable prose. The Postgres adapter persists these as native `enum`
 * columns, so translating their values (e.g. "narrow" -> "schmal") produces an
 * invalid enum value and makes the locale-row INSERT fail with
 * `invalid input value for enum`. These must never be sent to the translator.
 */
const NON_TRANSLATABLE_FIELD_TYPES = new Set(['select', 'radio'])

/**
 * Container field types that hold nested fields rather than a leaf value.
 * Localization (`localized: true`) set on a named container (`group`, `array`,
 * `blocks`, named `tab`) cascades to every field nested within it.
 */
const CONTAINER_FIELD_TYPES = new Set(['array', 'blocks', 'collapsible', 'group', 'row', 'tabs'])

export type OverlayOptions = {
  /**
   * Localization inherited from an ancestor container (`group`/`array`/`blocks`/
   * named `tab`) that has `localized: true`. When true, every nested field is
   * treated as localized.
   */
  inheritedLocalized?: boolean
  /**
   * When true, only fields that are localized (directly or via an ancestor
   * container) are kept from `translated`; every non-localized field is restored
   * from `original` so it is effectively excluded from translation.
   */
  localizedOnly?: boolean
}

/**
 * Walks a Payload field schema and copies canonical (untranslated) values from
 * `original` back into `translated`, in place. A field's value is restored when:
 *
 *  - it is a `select`/`radio` field (enum-backed; always restored), or
 *  - `localizedOnly` is enabled and the field is not localized (directly or via
 *    a localized ancestor container).
 *
 * This works regardless of which translation strategy produced `translated`
 * (optimized, legacy, or a custom translator).
 */
export function overlayNonTranslatableValues(
  translated: any,
  original: any,
  fields: Field[] | undefined,
  options: OverlayOptions = {},
): void {
  if (
    !Array.isArray(fields) ||
    !translated ||
    typeof translated !== 'object' ||
    !original ||
    typeof original !== 'object'
  ) {
    return
  }

  const { inheritedLocalized = false, localizedOnly = false } = options

  for (const field of fields as any[]) {
    const type = field?.type
    const name = typeof field?.name === 'string' ? field.name : undefined
    const isLocalized = inheritedLocalized || field?.localized === true

    // Container fields: recurse, cascading localization to nested fields.
    if (type && CONTAINER_FIELD_TYPES.has(type)) {
      const childOptions: OverlayOptions = { inheritedLocalized: isLocalized, localizedOnly }

      switch (type) {
        case 'array':
          if (name && Array.isArray(translated[name]) && Array.isArray(original[name])) {
            translated[name].forEach((item: any, index: number) => {
              overlayNonTranslatableValues(item, original[name][index], field.fields, childOptions)
            })
          } else if (localizedOnly && name && !isLocalized && original[name] !== undefined) {
            translated[name] = original[name]
          }
          break

        case 'blocks':
          if (name && Array.isArray(translated[name]) && Array.isArray(original[name])) {
            const blockDefs: any[] = Array.isArray(field.blocks) ? field.blocks : []
            translated[name].forEach((item: any, index: number) => {
              const originalItem = original[name][index]
              const blockType = item?.blockType ?? originalItem?.blockType
              const blockDef = blockDefs.find((b) => b?.slug === blockType)
              if (blockDef) {
                overlayNonTranslatableValues(item, originalItem, blockDef.fields, childOptions)
              }
            })
          } else if (localizedOnly && name && !isLocalized && original[name] !== undefined) {
            translated[name] = original[name]
          }
          break

        case 'collapsible':
        case 'row':
          // Presentational wrappers share the parent object and cannot be localized.
          overlayNonTranslatableValues(translated, original, field.fields, {
            inheritedLocalized,
            localizedOnly,
          })
          break

        case 'group':
          if (name) {
            overlayNonTranslatableValues(
              translated[name],
              original[name],
              field.fields,
              childOptions,
            )
          }
          break

        case 'tabs':
          if (Array.isArray(field.tabs)) {
            for (const tab of field.tabs) {
              const tabName = typeof tab?.name === 'string' ? tab.name : undefined
              const tabLocalized = inheritedLocalized || tab?.localized === true
              if (tabName) {
                overlayNonTranslatableValues(translated[tabName], original[tabName], tab.fields, {
                  inheritedLocalized: tabLocalized,
                  localizedOnly,
                })
              } else {
                // Unnamed tabs share the parent object.
                overlayNonTranslatableValues(translated, original, tab.fields, {
                  inheritedLocalized,
                  localizedOnly,
                })
              }
            }
          }
          break
      }

      continue
    }

    // Leaf fields: restore the original value when it must not be translated.
    if (!name) {
      continue
    }

    const isEnumField = Boolean(type && NON_TRANSLATABLE_FIELD_TYPES.has(type))
    const shouldRestore = isEnumField || (localizedOnly && !isLocalized)

    if (shouldRestore && original[name] !== undefined) {
      translated[name] = original[name]
    }
  }
}

/**
 * Recursively extracts all field paths and their values from a document
 */
export function extractFieldPaths(
  data: any,
  parentPath: string = '',
  fields?: Field[],
): FieldPath[] {
  const paths: FieldPath[] = []

  if (!data || typeof data !== 'object') {
    return paths
  }

  for (const [key, value] of Object.entries(data)) {
    const currentPath = parentPath ? `${parentPath}.${key}` : key

    // Skip internal fields
    if (
      key === 'id' ||
      key === '_id' ||
      key === 'createdAt' ||
      key === 'updatedAt' ||
      key === 'translationSync' ||
      key === '__v'
    ) {
      continue
    }

    // Add current field
    paths.push({
      parentPath,
      path: currentPath,
      value,
    })

    // Recursively process nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      paths.push(...extractFieldPaths(value, currentPath, fields))
    }

    // Process arrays
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        const arrayPath = `${currentPath}.${index}`
        if (item && typeof item === 'object') {
          paths.push(...extractFieldPaths(item, arrayPath, fields))
        }
      })
    }
  }

  return paths
}

/**
 * Filters out excluded paths from data before translation
 */
export function filterExcludedPaths(data: any, excludedPaths: string[]): any {
  if (!data || typeof data !== 'object' || excludedPaths.length === 0) {
    return data
  }

  const filtered = JSON.parse(JSON.stringify(data)) // Deep clone

  for (const excludedPath of excludedPaths) {
    deletePath(filtered, excludedPath)
  }

  return filtered
}

/**
 * Merges translated data back, respecting excluded paths
 */
export function mergeTranslatedData(
  originalData: any,
  translatedData: any,
  excludedPaths: string[],
): any {
  if (!translatedData || typeof translatedData !== 'object') {
    return originalData
  }

  const merged = JSON.parse(JSON.stringify(originalData)) // Deep clone

  function merge(target: any, source: any, currentPath: string = ''): void {
    for (const key in source) {
      const fullPath = currentPath ? `${currentPath}.${key}` : key

      // Skip if this path is excluded
      if (isPathExcluded(fullPath, excludedPaths)) {
        continue
      }

      // Skip internal fields
      if (
        key === 'id' ||
        key === '_id' ||
        key === 'createdAt' ||
        key === 'updatedAt' ||
        key === 'translationSync' ||
        key === '__v'
      ) {
        continue
      }

      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) {
          target[key] = {}
        }
        merge(target[key], source[key], fullPath)
      } else {
        target[key] = source[key]
      }
    }
  }

  merge(merged, translatedData)
  return merged
}

/**
 * Checks if a path is excluded or if any parent path is excluded
 */
export function isPathExcluded(path: string, excludedPaths: string[]): boolean {
  return excludedPaths.some((excludedPath) => {
    // Exact match
    if (path === excludedPath) {
      return true
    }

    // Check if path is a child of excluded path
    if (path.startsWith(`${excludedPath}.`)) {
      return true
    }

    // Check if excluded path is a pattern match for arrays (e.g., content.0.title)
    const pathParts = path.split('.')
    const excludedParts = excludedPath.split('.')

    for (let i = 0; i < Math.min(pathParts.length, excludedParts.length); i++) {
      if (excludedParts[i] !== pathParts[i]) {
        // Check if it's an array index difference
        if (!isNaN(Number(pathParts[i])) && !isNaN(Number(excludedParts[i]))) {
          continue
        }
        return false
      }
    }

    return excludedParts.length <= pathParts.length
  })
}

/**
 * Deletes a path from an object using dot notation
 */
function deletePath(obj: any, path: string): void {
  const parts = path.split('.')
  let current = obj

  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) {
      return
    }
    current = current[parts[i]]
  }

  delete current[parts[parts.length - 1]]
}

/**
 * Gets value at path using dot notation
 */
export function getValueAtPath(obj: any, path: string): any {
  return path.split('.').reduce((current, part) => current?.[part], obj)
}

/**
 * Sets value at path using dot notation
 */
export function setValueAtPath(obj: any, path: string, value: any): void {
  const parts = path.split('.')
  let current = obj

  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) {
      current[parts[i]] = {}
    }
    current = current[parts[i]]
  }

  current[parts[parts.length - 1]] = value
}

/**
 * Checks if a field is a localized field
 */
export function isLocalizedField(field: Field): boolean {
  return 'localized' in field && field.localized === true
}

/**
 * Gets all localized field paths from a collection config
 */
export function getLocalizedFieldPaths(fields: Field[], parentPath: string = ''): string[] {
  const paths: string[] = []

  for (const field of fields) {
    if (!('name' in field)) {
      continue
    }

    const fieldPath = parentPath ? `${parentPath}.${field.name}` : field.name

    if (isLocalizedField(field)) {
      paths.push(fieldPath)
    }

    // Recursively check nested fields
    if ('fields' in field && Array.isArray(field.fields)) {
      paths.push(...getLocalizedFieldPaths(field.fields, fieldPath))
    }

    // Check blocks
    if (field.type === 'blocks' && 'blocks' in field && Array.isArray(field.blocks)) {
      for (const block of field.blocks) {
        if ('fields' in block && Array.isArray(block.fields)) {
          paths.push(...getLocalizedFieldPaths(block.fields, fieldPath))
        }
      }
    }

    // Check group fields
    if (field.type === 'group' && 'fields' in field && Array.isArray(field.fields)) {
      paths.push(...getLocalizedFieldPaths(field.fields, fieldPath))
    }

    // Check array fields
    if (field.type === 'array' && 'fields' in field && Array.isArray(field.fields)) {
      paths.push(...getLocalizedFieldPaths(field.fields, fieldPath))
    }
  }

  return paths
}
