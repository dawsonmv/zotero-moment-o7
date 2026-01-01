# Archive Service Configuration UI Feature Plan

**Feature Name**: Archive Service Configuration UI
**Status**: Planning
**Priority**: High
**Complexity**: Medium
**Estimated Effort**: 5-7 days

---

## 1. Feature Overview

### Purpose
Create an intuitive user interface within Zotero's preferences panel that allows users to:
- Configure which archive services are enabled/disabled
- Manage credentials for services that require authentication (Internet Archive, Perma.cc)
- Set service preferences (timeouts, proxy URLs, retry policies)
- View service availability and health status
- Test archive service connectivity
- Reorder service fallback priority

### Target Users
- Zotero researchers who want granular control over archiving behavior
- Users with Internet Archive or Perma.cc accounts who need credential management
- Advanced users wanting to optimize service selection for their workflow

---

## 2. Requirements & Acceptance Criteria

### Functional Requirements

#### FR-1: Service Enable/Disable
- [ ] Display all available archive services (Internet Archive, Archive.today, Perma.cc, UK Web Archive, Arquivo.pt)
- [ ] Allow users to toggle each service on/off
- [ ] Persist service enabled state to preferences
- [ ] Show service status (available/unavailable) via health check
- [ ] Disable service toggle if health check indicates service is down

#### FR-2: Credential Management
- [ ] Secure credential storage for services requiring authentication
- [ ] Internet Archive: Store and update access key and secret key
- [ ] Perma.cc: Store and update API key
- [ ] Archive.today: Store optional proxy URL
- [ ] Clear/reset credentials functionality
- [ ] Test credentials button with visual feedback

#### FR-3: Service Preferences
- [ ] Global timeout setting (default: 120 seconds)
- [ ] Enable/disable pre-archive checks (check for existing mementos)
- [ ] Archive age threshold (default: 30 days)
- [ ] Fallback order configuration (drag-to-reorder)
- [ ] Auto-archive on new item toggle

#### FR-4: Service Priority/Ordering
- [ ] Display services in current fallback order
- [ ] Drag-and-drop to reorder service priority
- [ ] Visual indication of current fallback order
- [ ] Reset to default order button

#### FR-5: Service Health & Testing
- [ ] Display each service's health status
- [ ] "Test Connection" button for each service
- [ ] Show last health check timestamp
- [ ] Auto-refresh health status on panel open
- [ ] Detailed error messages if service is unavailable

### Non-Functional Requirements

#### NR-1: Security
- [ ] Credentials encrypted at rest using CredentialManager
- [ ] No credentials logged or exposed in debugging output
- [ ] Input validation on all credential fields
- [ ] Secure deletion of credentials when cleared

#### NR-2: Performance
- [ ] Preferences panel loads in < 2 seconds
- [ ] Health checks performed asynchronously (non-blocking)
- [ ] UI remains responsive during credential testing
- [ ] Drag-to-reorder uses efficient DOM updates

#### NR-3: Accessibility
- [ ] WCAG 2.1 AA compliance
- [ ] Keyboard navigation support (Tab, Enter, Space)
- [ ] Screen reader friendly labels and descriptions
- [ ] Color not sole means of conveying information

#### NR-4: Usability
- [ ] Clear, concise labels and help text
- [ ] Visual feedback for user actions (toggles, buttons)
- [ ] Confirmation dialogs for destructive actions
- [ ] Tooltips for advanced settings

---

## 3. User Interface Design

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Archive Service Configuration                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ 📋 ENABLED SERVICES                                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ☑ Internet Archive (web.archive.org)         ✓ Online  │ │
│ │   Drag to reorder  [Test Connection]                   │ │
│ │                                                         │ │
│ │ ☑ Archive.today                              ✓ Online  │ │
│ │   Drag to reorder  [Test Connection]                   │ │
│ │                                                         │ │
│ │ ☑ Perma.cc                                   ✓ Online  │ │
│ │   Drag to reorder  [Test Connection]                   │ │
│ │                                                         │ │
│ │ ☐ UK Web Archive                             ⚠ Offline │ │
│ │   Drag to reorder  [Test Connection]                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ 🔐 CREDENTIALS                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Internet Archive                                        │ │
│ │ Access Key: [________] Secret Key: [________]          │ │
│ │                         [Clear] [Test Credentials]     │ │
│ │                                                         │ │
│ │ Perma.cc                                               │ │
│ │ API Key: [________] [Clear] [Test Credentials]        │ │
│ │                                                         │ │
│ │ Archive.today Proxy                                    │ │
│ │ Proxy URL: [________________] [Clear]                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ⚙️ PREFERENCES                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Request Timeout: [120] seconds                         │ │
│ │ ☑ Check for existing archives before archiving        │ │
│ │   Archive age threshold: [30] days                     │ │
│ │ ☑ Auto-archive new items                              │ │
│ │ [Reset to Default]                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│                              [Save] [Cancel]                 │
└─────────────────────────────────────────────────────────────┘
```

### Visual States

#### Service Item States
- **Enabled, Online**: ☑ Green checkmark ✓
- **Enabled, Offline**: ☑ Orange warning ⚠
- **Disabled, Online**: ☐ Gray unchecked
- **Disabled, Offline**: ☐ Gray unchecked (disabled toggle)

#### Credential States
- **Not Set**: "No credentials configured" (light gray)
- **Set**: Masked dots (••••••••) with [Clear] button
- **Testing**: Loading spinner
- **Valid**: ✓ Green checkmark
- **Invalid**: ✗ Red X with error message

---

## 4. Technical Architecture

### Component Structure

```
src/modules/
├── preferences/
│   ├── PreferencesManager.ts (existing - extend)
│   ├── ui/
│   │   ├── PreferencesPanel.ts (NEW - main panel)
│   │   ├── ServiceConfigSection.ts (NEW - services)
│   │   ├── CredentialsSection.ts (NEW - credentials)
│   │   ├── PreferencesSection.ts (NEW - settings)
│   │   └── ServiceItem.ts (NEW - service row)
│   └── styles/
│       └── preferences.css (NEW - styling)
├── monitoring/
│   ├── HealthChecker.ts (existing - extend)
│   └── types.ts (existing - extend)
└── utils/
    ├── CredentialManager.ts (existing - no changes)
    └── HtmlUtils.ts (existing - for sanitization)
```

### Key Classes & Interfaces

#### PreferencesPanel (Main Controller)
```typescript
class PreferencesPanel {
  // UI Elements
  private serviceSection: ServiceConfigSection;
  private credentialsSection: CredentialsSection;
  private preferencesSection: PreferencesSection;

  // Initialize UI
  async render(): Promise<void>

  // Event handlers
  onServiceToggle(serviceId: string, enabled: boolean): void
  onTestConnection(serviceId: string): Promise<void>
  onServiceReorder(services: string[]): void
  onCredentialUpdate(serviceId: string, credentials: any): void
  onSave(): void
  onCancel(): void
}
```

#### ServiceConfigSection
```typescript
class ServiceConfigSection {
  // Render service list
  async renderServices(): Promise<void>

  // Service management
  updateServiceStatus(serviceId: string, status: ServiceStatus): void
  enableService(serviceId: string): void
  disableService(serviceId: string): void
  reorderServices(order: string[]): void

  // Testing
  async testConnection(serviceId: string): Promise<boolean>
}
```

#### CredentialsSection
```typescript
class CredentialsSection {
  // Render credential forms
  async renderCredentials(): Promise<void>

  // Credential management
  async updateCredentials(serviceId: string, creds: any): void
  async clearCredentials(serviceId: string): void
  async testCredentials(serviceId: string): Promise<boolean>

  // Validation
  validateCredentialInput(serviceId: string, input: any): boolean
}
```

---

## 5. Data Model & Storage

### Preference Keys

```typescript
// Service configuration
extensions.momento7.enabledServices: string[] // ["internetarchive", "archivetoday", ...]
extensions.momento7.fallbackOrder: string[]   // Service order for fallback

// Global preferences
extensions.momento7.timeout: number            // Request timeout in ms
extensions.momento7.checkBeforeArchive: boolean // Pre-archive check
extensions.momento7.archiveAgeThreshold: number // Age threshold in ms
extensions.momento7.autoArchive: boolean       // Auto-archive on new item

// Proxy settings
extensions.momento7.archiveTodayProxyUrl: string
```

### Credential Storage (via CredentialManager)

```typescript
// Stored securely with encryption
const credentials = {
  "iaAccessKey": "ABC123...",      // Internet Archive
  "iaSecretKey": "XYZ789...",
  "permaCCApiKey": "DEF456...",    // Perma.cc
  // Archive.today proxy URL stored in preferences (no auth needed)
}
```

---

## 6. Implementation Plan

### Phase 1: Foundation (Days 1-2)

**Goals**: Set up basic UI structure and state management

Tasks:
- [ ] Create PreferencesPanel class and initialize Zotero prefs XUL
- [ ] Build ServiceConfigSection with service list display
- [ ] Add service enable/disable toggle handlers
- [ ] Implement basic styling for preferences panel
- [ ] Create PreferencesSection for global settings

### Phase 2: Credentials (Day 3)

**Goals**: Implement credential management UI

Tasks:
- [ ] Build CredentialsSection component
- [ ] Create credential input forms for each service
- [ ] Implement credential storage via CredentialManager
- [ ] Add credential validation and error handling
- [ ] Create [Clear] and [Test] buttons with feedback

### Phase 3: Advanced Features (Days 4-5)

**Goals**: Add drag-to-reorder and health checking

Tasks:
- [ ] Implement drag-and-drop reordering of services
- [ ] Integrate HealthChecker for service status display
- [ ] Add [Test Connection] button for each service
- [ ] Show last health check timestamp
- [ ] Add auto-refresh health status on panel open

### Phase 4: Polish & Testing (Days 6-7)

**Goals**: Accessibility, documentation, and comprehensive testing

Tasks:
- [ ] Ensure WCAG 2.1 AA accessibility compliance
- [ ] Add keyboard navigation (Tab, Enter, Space)
- [ ] Write comprehensive unit tests
- [ ] Create integration tests with preferences
- [ ] Write user-facing documentation
- [ ] Create screenshot documentation

---

## 7. Testing Strategy

### Unit Tests

**PreferencesPanel.test.ts**
```typescript
describe("PreferencesPanel", () => {
  // Initialization
  test("should initialize with current preferences", async () => {})
  test("should load service status on render", async () => {})

  // Service management
  test("should toggle service enabled/disabled", async () => {})
  test("should persist service changes to preferences", async () => {})
  test("should reorder services and update fallback order", async () => {})

  // Credentials
  test("should store credentials securely", async () => {})
  test("should validate credential input", async () => {})
  test("should test credentials and show result", async () => {})
})
```

**ServiceConfigSection.test.ts**
```typescript
describe("ServiceConfigSection", () => {
  test("should render all available services", () => {})
  test("should display service status indicators", () => {})
  test("should handle service toggle events", () => {})
  test("should implement drag-to-reorder", () => {})
})
```

**CredentialsSection.test.ts**
```typescript
describe("CredentialsSection", () => {
  test("should render credential forms for auth services", () => {})
  test("should mask credential input", () => {})
  test("should validate credentials before saving", () => {})
  test("should securely clear credentials", () => {})
})
```

### Integration Tests

**Preferences Integration.test.ts**
```typescript
describe("Preferences Integration", () => {
  test("should sync preferences panel with PreferencesManager", async () => {})
  test("should test credentials with archive services", async () => {})
  test("should update service availability in real-time", async () => {})
})
```

### Manual Testing Checklist

- [ ] Load preferences panel without errors
- [ ] Toggle each service enable/disable
- [ ] Reorder services via drag-and-drop
- [ ] Enter and save credentials for each service
- [ ] Test [Test Connection] button for each service
- [ ] Verify credentials are not exposed in logs
- [ ] Check accessibility with screen reader
- [ ] Test on different Zotero versions
- [ ] Test preferences sync across windows

---

## 8. Security Considerations

### Credential Security
- ✅ Use CredentialManager for encryption at rest
- ✅ Never log or expose credentials
- ✅ Mask credential display (••••••••)
- ✅ Require explicit [Clear] action to delete credentials
- ✅ Validate all credential input

### Input Validation
- ✅ Validate URLs (for proxy URL and service endpoints)
- ✅ Validate timeout values (min: 1000ms, max: 600000ms)
- ✅ Sanitize error messages for display
- ✅ Prevent XSS via HtmlUtils.escape()

### Privacy
- ✅ Preferences stored locally (no cloud sync)
- ✅ Credentials not transmitted except to services
- ✅ User controls which services are enabled
- ✅ Clear audit trail in preferences panel

---

## 9. Success Metrics

| Metric | Target | Rationale |
|--------|--------|-----------|
| Load Time | < 2 seconds | Quick access to settings |
| Test Success Rate | > 95% | Reliable credential testing |
| User Satisfaction | > 4/5 stars | Intuitive UI |
| Accessibility Score | > 90 (Axe) | WCAG 2.1 AA compliance |
| Test Coverage | > 80% | Code quality |

---

## 10. Dependencies & Resources

### New Dependencies
- None required (use existing Zotero APIs)

### Existing Dependencies Used
- `zotero-plugin-toolkit` - UI components and preferences
- `CredentialManager` - Secure credential storage
- `PreferencesManager` - Preference management
- `HealthChecker` - Service health monitoring

### Resources
- [Zotero Preferences Documentation](https://www.zotero.org/support/dev/client_coding/preferences)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)

---

## 11. Risk Assessment & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-----------|--------|-----------|
| Credential exposure | Low | Critical | Use CredentialManager, code review |
| XUL/UI compatibility | Medium | High | Test on Zotero 7.0+ |
| Performance regression | Low | Medium | Profile rendering, async health checks |
| User confusion | Medium | Medium | Clear labels, help text, tutorials |
| Breaking changes | Low | High | Backward compat testing |

---

## 12. Rollout Plan

### Phase 1: Development
- Create feature branch: `git checkout -b feature/archive-service-config-ui`
- Implement features in phases (foundation → credentials → advanced)
- Continuous testing and code review

### Phase 2: Testing
- Internal QA testing on multiple Zotero versions
- Accessibility audit (Axe DevTools)
- Security review of credential handling

### Phase 3: Beta
- Release as beta feature in v1.1.0-beta
- Collect user feedback
- Monitor for bugs and edge cases

### Phase 4: Production
- Release as stable feature in v1.1.0
- Document in user guide
- Announce in release notes

---

## 13. Documentation Plan

### User Documentation
- [ ] Create preferences guide with screenshots
- [ ] Document credential setup for each service
- [ ] Add troubleshooting section

### Developer Documentation
- [ ] Component API documentation
- [ ] Event flow diagrams
- [ ] Contribution guide for extending services

### Code Documentation
- [ ] JSDoc comments on all public methods
- [ ] Architecture decision records (ADRs)
- [ ] Design pattern explanations

---

## Conclusion

The Archive Service Configuration UI will provide users with powerful, intuitive control over their archiving workflow. By leveraging existing infrastructure (CredentialManager, PreferencesManager, HealthChecker) and following accessibility best practices, we'll create a professional, user-friendly interface that enhances the Zotero Momento7 experience.

**Next Steps**:
1. Review and approve this plan
2. Create feature branch
3. Begin Phase 1 implementation
4. Schedule architecture review with team

---

**Document Version**: 1.0
**Last Updated**: 2026-01-01
**Author**: Claude Code
**Status**: Ready for Implementation Review
