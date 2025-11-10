import type { Field } from 'payload'
import type { FieldPath } from '../types/index.js'

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
      path: currentPath,
      value,
      parentPath,
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
    if (!('name' in field)) continue

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
