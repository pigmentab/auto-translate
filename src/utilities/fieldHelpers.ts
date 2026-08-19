import type { Field } from 'payload'

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
