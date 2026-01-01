# Archive Service Configuration UI - Implementation Status & Roadmap

**Status**: Early Foundation Phase (15-20% complete)
**Last Updated**: 2026-01-01
**Current Branch**: `feature/archive-service-config-ui`

---

## 1. Completion Status Overview

### Summary Metrics
| Category | Status | Progress |
|----------|--------|----------|
| **Planning & Design** | ✅ Complete | 100% |
| **Component Scaffolds** | ⚠️ Partial | 20% |
| **UI Implementation** | ❌ Not Started | 0% |
| **Functionality** | ❌ Not Started | 0% |
| **Testing** | ❌ Partial | 10% |
| **Integration** | ❌ Not Started | 0% |
| **Documentation** | ⚠️ Partial | 50% |
| **Overall** | ⚠️ Early Stage | 15-20% |

---

## 2. What Is Complete ✅

### 2.1 Feature Planning & Documentation
**Files**: `.pac/features/archive-service-config-ui.md`

✅ **Completed**:
- Comprehensive feature overview and requirements
- 5 functional requirements with acceptance criteria
- 4 non-functional requirements (security, performance, accessibility, usability)
- Detailed UI mockup with visual states
- Component architecture and data models
- 4-phase implementation plan
- Unit + integration + manual testing strategy
- Security, performance, and risk assessments
- Success metrics and rollout plan

**What This Covers**:
- Clear requirements for implementation
- Reference architecture
- Testing approach
- Security guidelines

### 2.2 Component Structure & Scaffolding
**Files**: `src/modules/preferences/ui/PreferencesPanel.ts`

✅ **Completed**:
- `PreferencesPanel` class structure with core methods
- `ServiceConfigSection` class structure
- `CredentialsSection` class structure
- `PreferencesSection` class structure
- Event handler infrastructure (EventEmitter pattern)
- Basic TypeScript types and interfaces
- Import statements and dependencies
- Method signatures for all components

⚠️ **Partial**:
- `initialize()` method - Has structure but needs XUL integration
- `render()` method - Calls sub-sections but doesn't wire up actual DOM
- Event binding - Infrastructure exists but no actual event firing

❌ **Missing**:
- Actual DOM element creation and manipulation
- Service/credential data rendering
- Form elements and inputs
- Event listener attachment
- Data persistence logic

### 2.3 Test Infrastructure
**Files**: `tests/preferences/PreferencesPanel.test.ts`

✅ **Completed**:
- Test file structure and imports
- Test suite organization (describe/beforeEach/afterEach)
- 40+ test case stubs covering all major features
- Mock setup for dependencies (PreferencesManager, HealthChecker)
- Container setup/cleanup

⚠️ **Partial**:
- Test cases defined but mostly empty (comment-only)
- Mock objects created but not fully utilized
- No actual assertions or test logic

---

## 3. What Is Incomplete ❌

### 3.1 ServiceConfigSection Implementation (30-40% effort)

**Current State**:
- Basic class structure with method stubs
- `render()` creates container but doesn't populate services
- `renderServiceList()` is a placeholder
- No service rendering
- No event emission
- No drag-and-drop support

**What Needs to Be Done**:

1. **Service List Rendering** (~4-6 hours)
   ```typescript
   // Need to implement:
   - Fetch available services from ServiceRegistry
   - Create HTML elements for each service:
     ☑ Service name and homepage link
     ✓/⚠ Status indicator (Online/Offline/Testing)
     [Test Connection] button
     Drag handle for reordering
   - Style each service item
   - Render in correct order
   ```

2. **Enable/Disable Toggles** (~2-3 hours)
   ```typescript
   // Need to implement:
   - Create checkbox input for each service
   - Track enabled/disabled state
   - Emit 'serviceToggle' event when changed
   - Persist state locally during session
   - Visual feedback for enabled vs disabled
   ```

3. **Service Testing** (~3-4 hours)
   ```typescript
   // Need to implement:
   - [Test Connection] button handlers
   - Call HealthChecker.checkService() for service
   - Show loading state during test
   - Display result (✓ Online / ✗ Offline)
   - Display error message if failed
   - Update UI with last check timestamp
   ```

4. **Drag-and-Drop Reordering** (~5-6 hours)
   ```typescript
   // Need to implement:
   - Add draggable attribute to service items
   - Implement dragstart/dragover/drop event handlers
   - Reorder DOM elements
   - Update internal service order list
   - Emit 'serviceReorder' event
   - Persist new order
   - Visual feedback during drag
   ```

5. **Event Firing** (~2-3 hours)
   ```typescript
   // Need to implement:
   - Emit 'serviceToggle' events with (serviceId, enabled)
   - Emit 'serviceReorder' events with new order array
   - Emit 'testConnection' events with serviceId
   - Connect events to listeners
   ```

6. **Status Updates** (~2 hours)
   ```typescript
   // Need to implement:
   - Implement setTestLoading(serviceId, loading)
   - Implement setTestResult(serviceId, success, error)
   - Update UI state for test operations
   - Disable/enable controls during testing
   ```

**Dependencies**:
- `ServiceRegistry` - To get available services
- `HealthChecker` - To test service connectivity
- Existing preference system for enabled services

**Total Estimated Effort**: 18-25 hours

---

### 3.2 PreferencesSection Implementation (10-15% effort)

**Current State**:
- Class structure with method stubs
- Hardcoded return values
- No actual form rendering
- No event handlers

**What Needs to Be Done**:

1. **Preferences Form Rendering** (~3-4 hours)
   ```typescript
   // Need to implement:
   - Timeout input field (number, min: 1000ms, max: 600000ms)
   - Auto-archive toggle checkbox
   - Check before archive toggle
   - Archive age threshold slider/input
   - Reset to defaults button
   - Help text for each setting
   ```

2. **Form Input Handling** (~3-4 hours)
   ```typescript
   // Need to implement:
   - onChange handlers for all inputs
   - Input validation (timeout range, age threshold)
   - Emit change events for parent panel
   - Update internal state
   ```

3. **Value Getters** (~2 hours)
   ```typescript
   // Need to implement:
   - Replace hardcoded values with form inputs
   - getTimeout() - Get value from input field
   - getCheckBeforeArchive() - Get checkbox state
   - getArchiveAgeThreshold() - Get threshold value
   - getAutoArchive() - Get checkbox state
   ```

4. **Preference Persistence** (~2 hours)
   ```typescript
   // Need to implement:
   - Load current preference values from PreferencesManager
   - Update input values on render
   - Track changes for save operation
   ```

**Dependencies**:
- `PreferencesManager` - For loading current preferences
- Form validation utilities

**Total Estimated Effort**: 10-14 hours

---

### 3.3 CredentialsSection Implementation (15-20% effort)

**Current State**:
- Class structure with method stubs
- No credential forms
- No credential display
- No validation

**What Needs to Be Done**:

1. **Credential Form Rendering** (~6-8 hours)
   ```typescript
   // Need to implement:
   - Internet Archive form (2 fields: access key, secret key)
   - Perma.cc form (1 field: API key)
   - Archive.today form (1 field: proxy URL)
   - Credential input fields (masked with dots)
   - Show/hide buttons for visibility toggle
   - Clear credential buttons
   - Test credential buttons
   ```

2. **Credential Loading** (~2-3 hours)
   ```typescript
   // Need to implement:
   - Load stored credentials from CredentialManager
   - Check if credentials exist
   - Display "Not configured" if missing
   - Display masked dots if present (••••••••)
   - Update UI on render
   ```

3. **Credential Storage** (~3-4 hours)
   ```typescript
   // Need to implement:
   - Capture credential input values
   - Validate credentials before storage
   - Call CredentialManager.setCredential()
   - Clear cached credentials
   - Show success message
   - Update UI after save
   ```

4. **Credential Testing** (~4-5 hours)
   ```typescript
   // Need to implement:
   - [Test Credentials] button handlers
   - Call appropriate service API with credentials
   - Show loading state during test
   - Display result (✓ Valid / ✗ Invalid)
   - Show error details if test fails
   - Handle timeout scenarios
   ```

5. **Credential Clearing** (~2-3 hours)
   ```typescript
   // Need to implement:
   - [Clear] button handlers
   - Confirmation dialog before clearing
   - Call CredentialManager.clearCredential()
   - Update UI to "Not configured"
   - Clear form inputs
   ```

6. **Input Validation** (~2-3 hours)
   ```typescript
   // Need to implement:
   - Validate API key format
   - Validate URL format (for proxy URL)
   - Provide clear error messages
   - Disable save if validation fails
   ```

**Dependencies**:
- `CredentialManager` - For credential storage/retrieval
- Archive service implementations - For credential testing
- Form validation utilities

**Total Estimated Effort**: 19-26 hours

---

### 3.4 Styling & CSS (5-8% effort)

**Current State**: None - no CSS file created

**What Needs to Be Done**:

1. **CSS Framework** (~3-4 hours)
   ```css
   /* Need to implement:
   - .momento7-preferences-panel { }
   - .momento7-services-section { }
   - .momento7-service-item { }
   - .momento7-service-item--enabled { }
   - .momento7-service-item--disabled { }
   - .momento7-service-status { }
   - .momento7-service-status--online { }
   - .momento7-service-status--offline { }
   - .momento7-credentials-section { }
   - .momento7-credential-form { }
   - .momento7-preferences-section { }
   - .momento7-action-buttons { }
   - .momento7-btn { }
   - .momento7-btn--primary { }
   - .momento7-btn--secondary { }
   - Loading states
   - Error states
   - Drag states
   */
   ```

2. **Responsive Design** (~2-3 hours)
   - Ensure readability on different panel widths
   - Mobile-friendly form inputs
   - Touch-friendly button sizes

3. **Accessibility Styling** (~1-2 hours)
   - Focus indicators for keyboard navigation
   - High contrast for visibility
   - Proper spacing for readability
   - Icon/color alternatives

**File**: `src/modules/preferences/styles/preferences.css` (NEW)

**Total Estimated Effort**: 6-9 hours

---

### 3.5 XUL/Zotero Integration (10-15% effort)

**Current State**: No integration - component is standalone

**What Needs to Be Done**:

1. **Zotero Preferences Panel Integration** (~5-6 hours)
   ```typescript
   // Need to implement:
   - Register panel with Zotero preferences
   - Create XUL preferences window binding
   - Initialize PreferencesPanel on window load
   - Handle window close/cancel
   - Integrate with Zotero's preference save mechanism
   ```

2. **Preferences Window** (~3-4 hours)
   ```xul
   <!-- Need to create or modify:
   - src/addon/content/preferences.xhtml
   - Add container div for preferences panel
   - Include CSS file
   - Add preference window bindings
   -->
   ```

3. **Lifecycle Management** (~2-3 hours)
   ```typescript
   // Need to implement:
   - Handle window initialization
   - Handle window close
   - Handle preference panel visibility
   - Clean up event listeners
   - Manage component lifecycle
   ```

**Files**:
- Modify: `src/addon/content/preferences.xhtml`
- Create/Modify: Integration hooks in main addon

**Total Estimated Effort**: 10-13 hours

---

### 3.6 Event Handler Wiring (8-12% effort)

**Current State**: Event infrastructure exists but handlers are stubbed

**What Needs to Be Done**:

1. **Service Event Handlers** (~3-4 hours)
   ```typescript
   // In PreferencesPanel.bindEventHandlers():
   - Connect serviceToggle → onServiceToggle()
   - Connect serviceReorder → onServiceReorder()
   - Connect testConnection → onTestConnection()
   - Ensure all events are properly fired from sections
   ```

2. **Credential Event Handlers** (~3-4 hours)
   ```typescript
   // In PreferencesPanel.bindEventHandlers():
   - Connect credentialUpdate → onCredentialUpdate()
   - Connect credentialTest → onTestCredentials()
   - Ensure credential section fires events
   ```

3. **State Management** (~2-3 hours)
   ```typescript
   // Need to implement:
   - Track pending changes in PreferencesPanel
   - Mark preferences as modified
   - Disable save button if no changes
   - Show unsaved warning on cancel
   ```

4. **Listener Management** (~2 hours)
   ```typescript
   // Need to implement:
   - Remove event listeners on panel close
   - Prevent memory leaks
   - Clean up references
   ```

**Total Estimated Effort**: 10-14 hours

---

### 3.7 Health Check Integration (5-8% effort)

**Current State**: Placeholder - returns no data

**What Needs to Be Done**:

1. **Service Status Display** (~3-4 hours)
   ```typescript
   // Need to implement:
   - Call HealthChecker.checkService() for each service
   - Display status (Online/Offline/Unknown)
   - Show last check timestamp
   - Color code status (green/yellow/red)
   - Auto-update on panel open
   ```

2. **Async Loading** (~2-3 hours)
   ```typescript
   // Need to implement:
   - Load health status asynchronously
   - Show loading spinner while checking
   - Handle check timeouts
   - Cache results for performance
   ```

3. **Real-time Updates** (~2 hours)
   ```typescript
   // Need to implement:
   - [Test Connection] button triggers health check
   - Update status in real-time
   - Show error details if failed
   ```

**Dependencies**:
- `HealthChecker` - Existing service availability checking

**Total Estimated Effort**: 7-9 hours

---

### 3.8 Credential Testing Implementation (8-12% effort)

**Current State**: Placeholder - returns hardcoded true

**What Needs to Be Done**:

1. **Internet Archive Credential Test** (~2-3 hours)
   ```typescript
   // Need to implement:
   - Use Internet Archive API
   - Test access key + secret key
   - Verify credentials work
   - Return success/failure
   ```

2. **Perma.cc Credential Test** (~2-3 hours)
   ```typescript
   // Need to implement:
   - Use Perma.cc API
   - Test API key
   - Verify credentials work
   - Return success/failure
   ```

3. **Archive.today Proxy Test** (~2-3 hours)
   ```typescript
   // Need to implement:
   - Test proxy URL connectivity
   - Verify proxy is working
   - Test through proxy if credentials present
   - Return success/failure
   ```

4. **Error Handling** (~1-2 hours)
   ```typescript
   // Need to implement:
   - Handle invalid credentials
   - Handle network errors
   - Handle API rate limiting
   - Provide specific error messages
   ```

**Dependencies**:
- Archive service implementations

**Total Estimated Effort**: 7-11 hours

---

### 3.9 Form Validation & Error Handling (10-15% effort)

**Current State**: No validation

**What Needs to Be Done**:

1. **Input Validation** (~4-5 hours)
   ```typescript
   // Need to implement:
   - Validate timeout range (1000-600000ms)
   - Validate age threshold format
   - Validate API key format
   - Validate URL format (proxy URL)
   - Provide user-friendly error messages
   - Real-time validation feedback
   ```

2. **Form Error Display** (~3-4 hours)
   ```typescript
   // Need to implement:
   - Error message containers
   - Show/hide error messages
   - Style error states
   - Disable submit if errors
   ```

3. **User Feedback** (~3-4 hours)
   ```typescript
   // Need to implement:
   - Success notifications
   - Error notifications
   - Loading states
   - Toast messages or alert system
   ```

**Total Estimated Effort**: 10-13 hours

---

### 3.10 Comprehensive Testing (15-20% effort)

**Current State**: Test scaffold exists, no actual test implementations

**What Needs to Be Done**:

1. **Unit Tests** (~8-10 hours)
   ```typescript
   // Need to implement:
   - PreferencesPanel initialization tests
   - ServiceConfigSection rendering tests
   - CredentialsSection rendering tests
   - PreferencesSection rendering tests
   - Event firing tests
   - State management tests
   - Getter/setter tests
   ```

2. **Integration Tests** (~5-6 hours)
   ```typescript
   // Need to implement:
   - Service enable/disable workflow
   - Credential save/load workflow
   - Preference save/load workflow
   - Drag-and-drop reordering
   - Service testing integration
   - Health check integration
   ```

3. **Accessibility Tests** (~3-4 hours)
   ```typescript
   // Need to implement:
   - Keyboard navigation tests
   - Screen reader compatibility tests
   - Color contrast tests
   - Focus management tests
   - ARIA label tests
   ```

**Files**: `tests/preferences/PreferencesPanel.test.ts`

**Total Estimated Effort**: 16-20 hours

---

### 3.11 Documentation (5-8% effort)

**Current State**: Feature plan exists, no inline documentation

**What Needs to Be Done**:

1. **Code Documentation** (~2-3 hours)
   ```typescript
   // Need to implement:
   - JSDoc comments for all public methods
   - Parameter descriptions
   - Return type descriptions
   - Usage examples
   - Complex logic explanations
   ```

2. **User Documentation** (~2-3 hours)
   - Screenshots of preferences panel
   - Setup guides for each service
   - Troubleshooting guide
   - FAQ section

3. **Developer Documentation** (~1-2 hours)
   - Component architecture diagram
   - Event flow documentation
   - Data flow documentation
   - Extension guide for new services

**Total Estimated Effort**: 5-8 hours

---

## 4. Recommended Completion Order

### Phase 1: Foundation (Days 1-2)
**Goal**: Get core UI rendering and basic interactions working

**Order**:
1. **Create CSS file** (6-9 hours)
   - Foundation styling
   - Component layouts
   - Basic states

2. **ServiceConfigSection UI** (18-25 hours)
   - Service list rendering
   - Enable/disable toggles
   - Status indicators
   - Initial event infrastructure

3. **PreferencesSection UI** (10-14 hours)
   - Preference form rendering
   - Input handlers
   - Value getters updated

**Why This Order**:
- CSS needed for all components
- ServiceConfigSection is foundation (other sections depend on seeing it work)
- PreferencesSection is simpler than CredentialsSection

**Blockers**: None - can start immediately

---

### Phase 2: Credentials & Polish (Days 3-4)
**Goal**: Complete credential management and add event wiring

**Order**:
1. **CredentialsSection UI** (19-26 hours)
   - Credential form rendering
   - Credential loading/storage
   - Clear functionality

2. **Event Handler Wiring** (10-14 hours)
   - Wire all service events
   - Wire all credential events
   - State management

**Why This Order**:
- Can be done in parallel with testing
- Depends on Phase 1 being mostly complete

**Blockers**: Phase 1 must be mostly complete

---

### Phase 3: Integration & Features (Days 5-6)
**Goal**: Integrate with Zotero, add testing and health checks

**Order**:
1. **XUL/Zotero Integration** (10-13 hours)
   - Preferences window setup
   - Lifecycle management

2. **Health Check Integration** (7-9 hours)
   - Service status display
   - Real-time updates

3. **Credential Testing** (7-11 hours)
   - Test credential implementations
   - Error handling

**Why This Order**:
- Integration must come before testing can work properly
- Health checks enable credential testing

**Blockers**: Phase 1-2 must be complete

---

### Phase 4: Polish & Testing (Days 7+)
**Goal**: Validation, testing, accessibility, and documentation

**Order**:
1. **Form Validation & Error Handling** (10-13 hours)
   - Input validation
   - Error display
   - User feedback

2. **Comprehensive Testing** (16-20 hours)
   - Unit tests
   - Integration tests
   - Accessibility tests

3. **Documentation** (5-8 hours)
   - Code documentation
   - User documentation
   - Developer documentation

**Why This Order**:
- Validation needed before intensive testing
- Testing validates all functionality
- Documentation last when everything is stable

**Blockers**: All functionality must be working

---

## 5. Dependency Map

```
CSS (6-9h)
  ↓
ServiceConfigSection (18-25h)
  ↓
PreferencesSection (10-14h)
  ↓
CredentialsSection (19-26h)
  ├─ Event Wiring (10-14h)
  └─ XUL Integration (10-13h)
      ├─ Health Check Integration (7-9h)
      └─ Credential Testing (7-11h)
          ├─ Form Validation (10-13h)
          └─ Testing (16-20h)
              └─ Documentation (5-8h)
```

---

## 6. Effort Summary

### Total Estimated Effort by Component

| Component | Hours | Days | Phase |
|-----------|-------|------|-------|
| CSS & Styling | 6-9 | 1 | 1 |
| ServiceConfigSection | 18-25 | 2.5-3 | 1 |
| PreferencesSection | 10-14 | 1.5-2 | 1 |
| CredentialsSection | 19-26 | 2.5-3 | 2 |
| Event Wiring | 10-14 | 1.5-2 | 2 |
| XUL Integration | 10-13 | 1.5-2 | 3 |
| Health Check Integration | 7-9 | 1-1.5 | 3 |
| Credential Testing | 7-11 | 1-1.5 | 3 |
| Form Validation | 10-13 | 1.5-2 | 4 |
| Testing | 16-20 | 2-2.5 | 4 |
| Documentation | 5-8 | 1-1.5 | 4 |
| **Total** | **118-162** | **16-22** | |

**Conservative Estimate**: 7-8 weeks (1 developer)
**Optimistic Estimate**: 4-5 weeks (1 developer, focused work)
**With 2 Developers**: 2-3 weeks

### Parallelizable Work
- Testing can happen in parallel with feature work
- Documentation can happen in parallel with implementation
- Some components can be worked on in parallel after Phase 1

---

## 7. Critical Path

**Longest Path to Completion**:
1. CSS (1 day)
2. ServiceConfigSection (2.5-3 days)
3. CredentialsSection (2.5-3 days)
4. Event Wiring (1.5-2 days)
5. XUL Integration (1.5-2 days)
6. Credential Testing (1-1.5 days)
7. Testing (2-2.5 days)

**Minimum Timeline**: 12-16 days with focused development

---

## 8. Risk Factors

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Zotero API compatibility | High | Early integration testing |
| Drag-drop complexity | Medium | Use proven library or polyfill |
| HealthChecker integration | Medium | Early prototyping |
| Credential security | High | Code review + security audit |
| Accessibility compliance | Medium | Early axe-core testing |

---

## 9. Success Criteria for Each Phase

### Phase 1: Foundation
- ✅ CSS file compiles without errors
- ✅ ServiceConfigSection renders all services
- ✅ Toggles enable/disable services
- ✅ PreferencesSection shows all options
- ✅ All inputs are functional

### Phase 2: Credentials & Events
- ✅ CredentialsSection forms render correctly
- ✅ Credentials can be stored/cleared
- ✅ Events fire correctly between sections
- ✅ Panel can save and close properly

### Phase 3: Integration
- ✅ Panel integrates with Zotero preferences
- ✅ Health checks display correctly
- ✅ Service testing works
- ✅ Credential testing works

### Phase 4: Polish & Release
- ✅ All tests pass (>80% coverage)
- ✅ Accessibility audit passes (WCAG 2.1 AA)
- ✅ No console errors
- ✅ Documentation complete

---

## Conclusion

The Archive Service Configuration UI feature is at **early foundation stage (15-20% complete)**. The remaining work requires systematic implementation of:

1. **UI Rendering** (48-65 hours) - Highest priority
2. **Integration** (27-35 hours) - Critical for functionality
3. **Features & Polish** (43-62 hours) - For production readiness

**Recommended Next Step**: Begin Phase 1 immediately with CSS and ServiceConfigSection to establish visual foundation and prove architectural approach.

---

**Document Version**: 1.0
**Last Updated**: 2026-01-01
**Next Review**: After Phase 1 completion
