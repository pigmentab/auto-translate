import type { Field } from 'payload'

/**
 * Recursively injects TranslationControl component into all localized fields
 */
export function injectTranslationControls(
  fields: Field[],
  defaultLocale: string,
  parentPath: string = '',
): Field[] {
  return fields.map((field) => {
    // Skip fields without names
    if (!('name' in field)) {
      return field
    }

    const fieldPath = parentPath ? `${parentPath}.${field.name}` : field.name

    // Clone the field to avoid mutations
    const clonedField: any = { ...field }

    // Inject TranslationControl if the field is localized
    // Skip for container fields - they're just UI/structural, not actual data fields
    // Only their nested fields should have translation controls
    const shouldSkipControl =
      clonedField.type === 'group' ||   // Groups are containers
      clonedField.type === 'blocks' ||  // Blocks are containers
      clonedField.type === 'array' ||   // Arrays are containers
      clonedField.type === 'tabs'       // Tabs are UI containers

    if ('localized' in clonedField && clonedField.localized === true && !shouldSkipControl) {
      // Initialize admin if not present
      if (!clonedField.admin) {
        clonedField.admin = {}
      }

      // Initialize components if not present
      if (!clonedField.admin.components) {
        clonedField.admin.components = {}
      }

      // Initialize afterInput if not present
      if (!clonedField.admin.components.afterInput) {
        clonedField.admin.components.afterInput = []
      }

      // Ensure afterInput is an array
      if (!Array.isArray(clonedField.admin.components.afterInput)) {
        clonedField.admin.components.afterInput = [clonedField.admin.components.afterInput]
      }

      // Check if TranslationControl is already added
      const hasTranslationControl = clonedField.admin.components.afterInput.some(
        (component: any) =>
          typeof component === 'object' &&
          component.path === '@pigment/auto-translate/client#TranslationControl',
      )

      // Add TranslationControl if not already present
      if (!hasTranslationControl) {
        clonedField.admin.components.afterInput.push({
          clientProps: {
            defaultLocale, // Pass default locale to component
            fieldPath,
          },
          path: '@pigment/auto-translate/client#TranslationControl',
        })
      }
    }

    // Recursively inject into nested fields
    if ('fields' in clonedField && Array.isArray(clonedField.fields)) {
      clonedField.fields = injectTranslationControls(clonedField.fields, defaultLocale, fieldPath)
    }

    // Recursively inject into tabs
    // Note: Tabs fields themselves don't create a path segment
    // Named tabs (with 'name' property) create their own path segment
    // Unnamed tabs use the parent path
    if ('tabs' in clonedField && Array.isArray(clonedField.tabs)) {
      clonedField.tabs = clonedField.tabs.map((tab: any) => {
        if (tab.fields) {
          // If the tab has a name, use it as the path segment
          // Otherwise, use the parent path (tabs field itself doesn't create a path)
          const tabPath = tab.name 
            ? (parentPath ? `${parentPath}.${tab.name}` : tab.name)
            : parentPath
          
          return {
            ...tab,
            fields: injectTranslationControls(tab.fields, defaultLocale, tabPath),
          }
        }
        return tab
      })
    }

    // Recursively inject into blocks
    if (clonedField.type === 'blocks' && 'blocks' in clonedField) {
      clonedField.blocks = clonedField.blocks.map((block: any) => {
        if (block.fields) {
          return {
            ...block,
            fields: injectTranslationControls(block.fields, defaultLocale, fieldPath),
          }
        }
        return block
      })
    }

    return clonedField as Field
  })
}
