# Development Workflow for Zotero Moment-o7

## Quick Start

```bash
# Clone repository
git clone https://github.com/dawsonmv/zotero-moment-o7.git
cd zotero-moment-o7

# Install dependencies
npm install

# Run tests
npm test

# Lint code
npm run lint

# Build plugin
npm run build

# Install in Zotero for development
npm run install-dev
```

## Development Cycle

### 1. Making Changes

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make your changes
code src/

# Run tests frequently
npm test

# Check code style
npm run lint:fix
```

### 2. Testing

#### Unit Tests
```bash
# Run all tests
npm test

# Run specific test file
node tests/test-framework.js tests/test-utils.js

# Add new test file
cp tests/test-utils.js tests/test-new-feature.js
```

#### Manual Testing
```bash
# Install development version
npm run install-dev

# Open Zotero with debug console
npm run zotero-dev

# Watch console for errors
# Test your feature manually
```

### 3. Building

```bash
# Clean build
rm -rf build/
npm run build

# The XPI file will be at:
# build/zotero-moment-o7.xpi
```

### 4. Debugging

#### Console Logging
```javascript
// In your code
Zotero.debug("[Moment-o7] Your debug message");

// View in Zotero
// Tools → Developer → Error Console
```

#### Breakpoints
```javascript
// Add debugger statement
debugger;

// Open Browser Toolbox
// Tools → Developer → Browser Toolbox
```

### 5. Code Style Guide

#### JavaScript
- Use tabs for indentation
- Double quotes for strings
- Semicolons required
- Curly braces for all blocks
- Constants in UPPER_CASE
- Async/await over promises

#### Naming
- Files: kebab-case.js
- Classes: PascalCase
- Functions/variables: camelCase
- Private methods: _prefixUnderscore

#### Comments
- JSDoc for public methods
- Inline comments for complex logic
- TODO: for future work
- FIXME: for known issues

### 6. Git Workflow

#### Commit Messages
```bash
# Format: type: description

# Types:
feat: New feature
fix: Bug fix
docs: Documentation
style: Formatting
refactor: Code restructuring
test: Adding tests
chore: Maintenance

# Examples:
git commit -m "feat: add UK Web Archive service"
git commit -m "fix: handle timeout errors gracefully"
git commit -m "docs: update API documentation"
```

#### Pull Request Process
1. Update your branch
   ```bash
   git fetch origin
   git rebase origin/master
   ```

2. Run all checks
   ```bash
   npm run lint
   npm test
   npm run build
   ```

3. Push to GitHub
   ```bash
   git push origin feature/your-feature-name
   ```

4. Create PR on GitHub
   - Clear description
   - Link related issues
   - Add screenshots if UI changes

## Project Structure

```
zotero-moment-o7/
├── src/
│   ├── core/           # Core plugin logic
│   │   ├── bootstrap.js    # Entry point
│   │   ├── main.js         # Main controller
│   │   └── utils.js        # Shared utilities
│   ├── services/       # Archive services
│   │   ├── base.js         # Base service class
│   │   └── *.js           # Individual services
│   ├── features/       # Feature modules
│   │   ├── moments.js      # Moment creation
│   │   └── memento-*.js   # Memento protocol
│   ├── ui/            # User interface
│   │   └── preferences.xhtml
│   └── unified/       # Simplified architecture
├── tests/             # Test files
├── scripts/           # Build scripts
├── locale/            # Translations
└── worker/           # Cloudflare worker
```

## Common Tasks

### Adding a New Archive Service

1. Create service file:
```javascript
// src/services/new-service.js
Zotero.MomentO7.Services.newService = {
    id: "newservice",
    name: "New Service",
    
    async archive(url) {
        // Implementation
    },
    
    async checkExisting(url) {
        // Optional: check if already archived
    }
};
```

2. Add to preferences:
```xml
<!-- src/ui/preferences.xhtml -->
<checkbox label="New Service" 
          preference="pref-service-newservice"/>
```

3. Add tests:
```javascript
// tests/test-new-service.js
test("archives to New Service", () => {
    // Test implementation
});
```

### Updating Dependencies

```bash
# Check outdated packages
npm outdated

# Update all dependencies
npm update

# Update specific package
npm install package-name@latest

# Run tests after update
npm test
```

### Release Process

1. Update version:
```bash
# Patch release (0.0.3 → 0.0.4)
npm version patch

# Minor release (0.0.3 → 0.1.0)
npm version minor

# Major release (0.0.3 → 1.0.0)
npm version major
```

2. Build release:
```bash
npm run release
```

3. Update changelog:
```markdown
## [0.0.4] - 2024-01-26
### Added
- New feature description

### Fixed
- Bug fix description

### Changed
- Change description
```

4. Create GitHub release:
- Upload .xpi file
- Copy changelog section
- Tag with version

## Troubleshooting

### Build Fails
```bash
# Clean and rebuild
rm -rf build/ node_modules/
npm install
npm run build
```

### Tests Fail
```bash
# Run with debug output
DEBUG=1 npm test

# Check test isolation
node tests/test-framework.js tests/test-specific.js
```

### Zotero Won't Load Plugin
1. Check Zotero version compatibility
2. Open Error Console for errors
3. Verify manifest.json is valid
4. Check file permissions

### Development Tips
- Use `Zotero.MomentO7.Utils` for common functions
- Test with different item types
- Handle errors gracefully
- Add progress feedback for long operations
- Respect user preferences

## Resources

- [Zotero Plugin Development](https://www.zotero.org/support/dev/client_coding)
- [Zotero API Documentation](https://www.zotero.org/support/dev/client_coding/javascript_api)
- [Bootstrap Extensions](https://www.zotero.org/support/dev/zotero_7_for_developers)
- [Fluent Localization](https://projectfluent.org/)

## Getting Help

- GitHub Issues: Report bugs and request features
- Zotero Forums: General plugin development questions
- Pull Requests: Contribute improvements

Remember: Keep it simple, test thoroughly, and focus on user value!