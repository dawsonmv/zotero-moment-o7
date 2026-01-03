# Type Definitions

This directory contains type definitions organized by their purpose and origin.

## Structure

- **augmentations/** - Extensions to zotero-types for missing Zotero 7 APIs
- **build/** - Build tool and runtime global type definitions
- **plugin/** - Plugin-specific domain types

## Guidelines

### When to Add Augmentations

Add to `augmentations/` when:
- Zotero 7 has an API that's not in zotero-types
- You've verified the API exists in the Zotero source code
- The type is needed for production code (not tests)

Before adding, check if it exists:
```bash
grep -r "your-type-name" node_modules/zotero-types/types/
```

### When to Add Plugin Types

Add to `plugin/` when:
- The type is specific to this plugin's domain
- The type is used across multiple modules
- The type represents plugin configuration or state

### When NOT to Add Types

Don't add types that:
- Already exist in zotero-types (check first!)
- Are only used in tests (add to tests/types/ instead)
- Are one-off interfaces (keep them local to the module)

## Type Sources

### From zotero-types

The project extends `zotero-types@4.1.0-beta.4` via tsconfig.json:

```json
{
  "extends": "zotero-types/entries/sandbox/"
}
```

This provides:
- `Zotero.*` namespace with all Zotero APIs
- `_ZoteroTypes.*` namespace for type augmentations
- `XUL.*` namespace for XUL elements
- Platform APIs (Firefox, Services, etc.)

### From This Project

Augmentations and project-specific types provide:
- Missing Zotero 7 APIs (augmentations/)
- Build-time globals (build/)
- Plugin configuration types (plugin/)

## Common Type Patterns

```typescript
// Using types from zotero-types
const item: Zotero.Item = ...;
const items: Zotero.Items = ...;
const pane: _ZoteroTypes.ZoteroPane | null = Zotero.getActiveZoteroPane();

// Using classes directly as types
const pw: Zotero.ProgressWindow = new Zotero.ProgressWindow();

// Using augmented types
await Zotero.HTTP.request(url, {  // 2-arg form from augmentations/http.d.ts
  method: 'POST',
  body: '...'
});

// Using plugin types
const pref: boolean = Zotero.Prefs.get('extensions.momento7.autoArchive');
```

## Maintenance

### When updating zotero-types

1. Check if any augmentations are now upstream
2. Run:
   ```bash
   npx tsc --noEmit
   grep -r "your-type" node_modules/zotero-types/types/
   ```
3. Remove augmentations that are now in zotero-types
4. Update code to use upstream types
5. Document changes in CHANGELOG

### Adding New Types

Use this decision tree:

```
Does the type exist in zotero-types?
├─ Yes → Use it directly, don't re-declare
└─ No → Is it a Zotero 7 API?
    ├─ Yes → Add to augmentations/
    └─ No → Is it plugin-specific?
        ├─ Yes → Add to plugin/
        └─ No → Is it build-time?
            ├─ Yes → Add to build/
            └─ No → Is it test-only?
                ├─ Yes → Add to tests/types/
                └─ No → Keep local to module
```

## Related Documentation

- See CLAUDE.md for type system organization and patterns
- See individual subdirectory READMEs for specific guidance
- See zotero-types documentation: https://github.com/windingwind/zotero-types
