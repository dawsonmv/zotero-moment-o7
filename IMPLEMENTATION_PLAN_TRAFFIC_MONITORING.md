# Implementation Plan: Traffic Monitoring & Concurrent Batch Archiving

**Status**: Approved for implementation
**Date**: 2026-01-01
**Reference**: `/Users/dawsonvaldes/.claude/plans/fluttering-sleeping-music.md`

## Executive Summary

This document outlines the implementation of traffic monitoring and concurrent batch archiving (max 4 concurrent items) for the Moment-o7 Zotero plugin.

### Key Features
- **Traffic Rating**: Measures archive service response time (score = seconds × 0.1)
- **Jamming Detection**: Services exceeding 20 seconds (score >= 2.0) are marked "jammed"
- **Concurrent Processing**: Archive up to 4 items simultaneously with queue-based scheduling
- **Real-time Feedback**: Display traffic scores inline with service names in progress window
- **Batch-Scoped State**: Reset traffic scores for each new batch operation

## Implementation Phases

### Phase 1: TrafficMonitor Utility
- **File**: `/src/utils/TrafficMonitor.ts` (~200 lines)
- **Singleton**: Manages traffic scores, jamming detection, and batch state
- **Key Methods**:
  - `startRequest()` - Begin tracking after 1 second delay
  - `endRequest()` - Calculate score and detect jamming
  - `getMeanScore()` - Get service average (excludes invalid scores)
  - `isServiceJammed()` - Check if service exceeded threshold
  - `resetBatch()` - Clear state for new batch
  - `getTrafficSummary()` - Format for display

### Phase 2: ConcurrentArchiveQueue
- **File**: `/src/utils/ConcurrentArchiveQueue.ts` (~250 lines)
- **Pattern**: Promise.race() based queue with max 4 concurrent
- **Features**:
  - Multi-line ProgressWindow management
  - Traffic summary in headline
  - Queue-based item processing (next starts when one completes)
  - Real-time status updates per item

### Phase 3: ArchiveCoordinator Integration
- **File**: `/src/modules/archive/ArchiveCoordinator.ts` (~80 line modifications)
- **Changes**:
  - Replace sequential for-loop with ConcurrentArchiveQueue
  - Add `archiveItemWithTracking()` wrapper
  - Filter jammed services in `archiveWithFallback()`
  - Add currentTrafficMonitor context tracking

### Phase 4: HTTP Request Tracking
- **File**: `/src/modules/archive/BaseArchiveService.ts` (~40 line modifications)
- **Changes**:
  - Wrap `makeHttpRequest()` with traffic monitoring
  - Implement 1-second delayed timer start
  - Record success/failure metrics
  - Maintain existing rate limiting

### Phase 5: Metrics Integration (Optional)
- **File**: `/src/modules/monitoring/Metrics.ts` (~60 line additions)
- **Features**:
  - Track long-term traffic statistics
  - Calculate percentiles and jam rates
  - Persist performance data across batches

## Critical Files

### New Files
```
/src/utils/TrafficMonitor.ts (200 lines)
/src/utils/ConcurrentArchiveQueue.ts (250 lines)
/tests/utils/TrafficMonitor.test.ts (150 lines)
/tests/utils/ConcurrentArchiveQueue.test.ts (200 lines)
```

### Modified Files
```
/src/modules/archive/ArchiveCoordinator.ts (80 line modifications)
/src/modules/archive/BaseArchiveService.ts (40 line modifications)
/src/modules/monitoring/Metrics.ts (60 line additions)
```

## Traffic Score Calculation

```
Response Timing:
  [t=0] HTTP request initiated
  [t=1s] TrafficMonitor.startRequest() (delayed start via setTimeout)
  [t=12s] Response received
  [t=12s] TrafficMonitor.endRequest()

Score Calculation:
  duration = response_time - delayed_start
  duration = 12s - 1s = 11 seconds
  score = 11 × 0.1 = 1.1

Jamming Detection:
  if (score >= 2.0) → Service is jammed
  Service skipped for remaining items in batch
```

## Concurrency Model

```
Max 4 concurrent items processing:
  Item 1: Service A → [t=0-15s]
  Item 2: Service B → [t=0-8s]    (completes early)
  Item 3: Service C → [t=8-22s]   (starts when Item 2 completes)
  Item 4: Service D → [t=15-18s]  (starts when Item 1 completes)
  Item 5: Service A → [t=22-26s]  (starts when Item 3 completes, uses Service A if not jammed)
```

## Rate Limiting Behavior

- **Per-Service**: 1 second minimum between requests to same service (existing BaseArchiveService behavior)
- **Concurrent Items**: Different items can archive to different services simultaneously
- **Same Service**: If 4 concurrent items all target one service, rate limiting still applies
- **Queue Priority**: FIFO - items start in the order they're queued

## Progress Display

```
Progress Window Headline:
"Archiving (3/5) | IA: 1.2 | AT: 0.8 | PC: JAMMED"

Per-Item Status:
  Item 1: "Processing..." → "Archived: https://web.archive.org/..."
  Item 2: "Error: Network timeout"
  Item 3: "Processing..."
  Item 4: "Archived: https://archive.today/..."
  Item 5: "Waiting..."
```

## Testing Plan

### Unit Tests
- [ ] TrafficMonitor score calculation
- [ ] Jamming detection (score >= 2.0)
- [ ] Mean filtering (exclude null/undefined/false/0)
- [ ] Batch reset clears state
- [ ] Queue concurrency limits (max 4)
- [ ] Promise.race() ordering

### Integration Tests
- [ ] Archive 10 items with 4 concurrency
- [ ] Jammed service skipping
- [ ] Per-service rate limiting enforcement
- [ ] ProgressWindow multi-line updates
- [ ] Traffic summary headline formatting

### Load Tests
- [ ] 100-item batch memory stability
- [ ] 50+ item ProgressWindow performance
- [ ] Stale timer cleanup
- [ ] Long-running batches (1000+ items)

## Risk Mitigation

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Memory leaks from uncompleted requests | High | Clean stale timers > 5 min old |
| Race conditions in score recording | Medium | Unique requestId per request |
| ProgressWindow performance with large batches | Medium | Warn user if > 50 items, offer chunking |
| Rate limiting conflicts | High | Test concurrent items with single service |
| CircuitBreaker integration | Low | Filter both jamming + circuit breaker states |

## Non-Obvious Behaviors

1. **Delayed Timer Start**: Tracking begins 1 second AFTER request, so responses < 1s score 0 (not recorded)
2. **Batch-Scoped Jamming**: Service jammed in batch N is NOT jammed in batch N+1 (state resets)
3. **Mean Excludes Invalid**: Only numeric scores > 0 contribute (null/undefined/false/0 filtered out)
4. **Concurrency Across Services**: 4 concurrent items may use different services; 1s rate limit applies within each service
5. **Timer Cleanup on Early Completion**: If response < 1s, delayed timer is cleared (Zotero.clearTimeout)

## Implementation Sequence

```
1. Create TrafficMonitor.ts + unit tests
2. Create ConcurrentArchiveQueue.ts + unit tests
3. Modify ArchiveCoordinator.ts
4. Modify BaseArchiveService.ts
5. Optional: Extend Metrics.ts
6. Integration testing (10-item batch)
7. Load testing (100-item batch)
8. Code review and merge
```

## Success Criteria

- [ ] 4 items archiving concurrently (vs sequential)
- [ ] Traffic scores displayed inline with service names
- [ ] Jammed services skipped for remainder of batch
- [ ] All 708 existing tests still passing
- [ ] 0 TypeScript compilation errors
- [ ] No memory leaks (100-item batch stable)
- [ ] Performance improvement (10 items: 50s → ~20s)

## References

- Original exploration: `/Users/dawsonvaldes/.claude/plans/fluttering-sleeping-music.md`
- Base architecture: `src/modules/archive/ArchiveCoordinator.ts`
- HTTP tracking: `src/modules/archive/BaseArchiveService.ts`
- Existing metrics: `src/modules/monitoring/Metrics.ts`
