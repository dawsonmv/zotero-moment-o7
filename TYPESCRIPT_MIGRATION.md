# TypeScript Migration Guide

This document describes the TypeScript migration of the Zotero Moment-o7 plugin.

## Overview

The codebase has been migrated to TypeScript to provide:
- Type safety and better IDE support
- Improved code maintainability
- Better error detection at compile time
- Preparation for Web API v3 integration

## Architecture Changes

### 1. Service Architecture
- All services now extend a simplified `BaseArchiveService` class
- Unified error handling and HTTP request management
- Type-safe service registry with automatic registration

### 2. Preferences Management
- Type-safe preference access via `PreferencesManager`
- Centralized preference key definitions
- Runtime validation of preference values

### 3. Web API v3 Architecture
- Created `WebAPIClient` class for future Web API v3 integration
- Type definitions for all Web API v3 entities
- Prepared infrastructure for sync features

## Building the Project

### Development Setup
```bash
# Install dependencies
npm install

# Build TypeScript
npm run build:ts

# Watch mode for development
npm run build:watch

# Type checking without building
npm run type-check

# Full build (TypeScript + XPI)
npm run build
```

### Project Structure
```
src/
├── types/              # TypeScript type definitions
│   ├── zotero.d.ts    # Zotero JavaScript API types
│   └── zotero-web-api.d.ts  # Web API v3 types
├── services/          # Archive service implementations
│   ├── types.ts       # Service interfaces
│   ├── BaseArchiveService.ts
│   └── ...
├── preferences/       # Preference management
├── memento/          # Memento Protocol implementation
├── webapi/           # Web API v3 client (future)
└── MomentO7.ts       # Main plugin class
```

## Development Workflow

1. **TypeScript Development**: Edit `.ts` files in `src/`
2. **Compilation**: Run `npm run build:ts` to compile
3. **Testing**: Install in Zotero using development mode
4. **Production Build**: Run `npm run build` for full XPI

## Key Improvements

### Type Safety
- All Zotero API calls are now type-checked
- Service interfaces ensure consistent implementation
- Preference access is type-safe

### Error Handling
- Unified error handling in BaseArchiveService
- Proper HTTP error mapping
- Better error messages for users

### Code Organization
- Clear separation of concerns
- Modular architecture
- Easy to add new services

## Migration Status

### Completed
- ✅ All archive services (Internet Archive, Archive.today, Perma.cc, UK Web Archive, Arquivo.pt)
- ✅ Service registry and coordinator
- ✅ Preferences management
- ✅ Memento Protocol implementation
- ✅ Robust link creator
- ✅ Signpost implementation
- ✅ Build configuration

### Future Work
- [ ] Implement Web API v3 sync features
- [ ] Add automated tests
- [ ] Improve error recovery
- [ ] Add more archive services

## Notes for Developers

1. **Type Definitions**: The `types/zotero.d.ts` file contains comprehensive type definitions for the Zotero JavaScript API. Update this file when using new Zotero APIs.

2. **Adding New Services**: To add a new archive service:
   - Create a new class extending `BaseArchiveService`
   - Implement the required `archive()` method
   - Register in `ServiceRegistry`

3. **Web API v3**: The infrastructure for Web API v3 is in place but not yet implemented. See `webapi/WebAPIClient.ts` for the prepared architecture.

4. **Debugging**: Source maps are generated for easier debugging. Use Zotero's Developer Tools to debug TypeScript code.