# Known Issues & Workarounds

## Backend Test Failures (Post-Triage)

### Infra Fixed (Was failing, now passes)
- **CreditApiTest** (23 tests) ✅ — **ALL PASS** after MySQL→SQLite migration fix + migration `dropColumn` SQLite guard

### Pre-existing Test Bugs (11 failures across 3 files)

#### 1. SocialiteTest — Incomplete Mock Expectations (3 failures)
- **Files**: `backend/tests/Feature/SocialiteTest.php`
- **Tests**: `test_callback_creates_new_user`, `test_callback_logs_in_existing_google_user`, `test_callback_links_existing_email_user`
- **Error**: Mockery `BadMethodCallException: offsetExists()` with no expectation specified — the `Socialite::shouldReceive('driver')` mock doesn't cover `offsetExists()` calls on the returned User object
- **Root Cause**: Socialite `User` mock is incomplete; the real Socialite `User` implements `ArrayAccess` which calls `offsetExists()`, but the mock doesn't expect it
- **Fix**: Add `$user->shouldReceive('offsetExists')->andReturn(true);` (or skip) in the mock setup
- **Impact**: 3 Socialite callback tests fail; OAuth not wired on frontend so no production impact

#### 2. PricingSecurityTest — Test Bugs vs Actual Implementation (6 failures)
- **Files**: `backend/tests/Feature/PricingSecurityTest.php`
- **Tests**: `test_price_tampering_detection`, `test_rate_limiting_on_calculate_endpoint`, `test_rate_limiting_on_config_endpoint`, `test_fraud_detection_too_many_requests`, `test_audit_log_captures_all_requests`, `test_unauthorized_user_cannot_access`
- **Root Causes**:
  - **Rate limiting tests** (3): Expect 429 at 60th request, but no rate limiter is configured for pricing endpoints — all requests return 200
  - **Unauthorized test**: Hits non-existent routes `/api/v1/pricing/packages` and `/api/v1/pricing/history` expecting 401 — gets 404
  - **Price tampering**: Expected response format `{success: false, data: {valid: false, price_changed: true}}` doesn't match actual `PriceController::validatePrice()` response shape
  - **Audit log**: Likely similar response format issue
- **Impact**: 6 tests fail; no production impact — these test features don't exist yet

#### 3. RenderJobServiceTest — Mock Expectations Mismatch (2 failures)
- **Files**: `backend/tests/Unit/Services/RenderJobServiceTest.php`
- **Error**: `NoMatchingExpectationException` — Mockery expectations don't match actual method calls
- **Root Cause**: Tests written before `RenderJobService` refactor; method signatures/calls changed
- **Impact**: 2 unit tests fail, unrelated to new feature development

### Pre-existing Test Failures (Not Yet Triaged) — 34 additional failures

#### 4. PricingApiTest — Response Shape Mismatch (7 failures)
- **Files**: `backend/tests/Feature/PricingApiTest.php`
- **Tests**: `config endpoint returns all options`, `calculate endpoint validates required fields`, `calculate endpoint basic`, `calculate endpoint with provider`, `calculate endpoint with quantity`, `packages endpoint requires auth`, `packages endpoint returns packages`, `history endpoint requires auth`, `history endpoint returns user history`
- **Root Causes**:
  - `config endpoint returns all options` — expects 3 resolutions in config response, actual is 2
  - `calculate endpoint validates required fields` — `assertJsonValidationErrors()` signature mismatch (passes 4 args instead of 1)
  - `calculate endpoint basic` — expects `total_credits=1125`, actual is 1650 (base credits changed from 1125 to 1500)
  - `calculate endpoint with provider` — provider `runway` not in valid providers list, returns 422
  - `calculate endpoint with quantity` — expects 5625, actual is 8250 (base credits changed)
  - `packages` and `history` endpoints — routes return 404 (endpoints not registered)
- **Impact**: 9 tests fail — pricing model base credits changed; tests not updated

#### 5. PricingConflictAnalysisTest — Base Credits Changed (7 failures)
- **Files**: `backend/tests/Feature/PricingConflictAnalysisTest.php`
- **Tests**: `pricing conflict analysis base credits vs base multiplier`, `text_to_video`, `image_to_video`, `reference_to_video`, `video_editing`, `character_animation`, `storyboard_video`, `no provider pricing returns default multiplier`, `inactive video type still calculates`
- **Root Cause**: Base credits in `VideoType` DB records were updated (e.g. text_to_video from 1125 → 1500) but test assertions still expect old values. All failures show actual `total_credits` ~1.47× higher than expected.
- **Impact**: 9 tests fail — tests need to be updated to match current base credits

#### 6. AuthApiTest — Email Verification/Reset Flow Stale (5 failures)
- **Files**: `backend/tests/Feature/AuthApiTest.php`
- **Tests**: `forgot password success`, `forgot password nonexistent email`, `verify reset code success`, `send verification success`, `send verification already verified`
- **Root Cause**: Email verification and password reset flows depend on mailpit/external services; mock expectations or environment config doesn't match current implementation
- **Impact**: 5 auth flow tests fail; no production impact — email services configured separately

#### 7. AssetApiTest — Auth Guard Setup (4 failures)
- **Files**: `backend/tests/Feature/AssetApiTest.php`
- **Tests**: `index returns empty list`, `index returns user assets`, `show returns asset`, `show cannot view other users asset`
- **Root Cause**: JWT token not properly authenticating for asset endpoints; tests expect 200 but likely get 401 or 403
- **Impact**: 4 CRUD tests fail — asset endpoints not fully testable without proper auth setup

#### 8. RegistrationAbuseTest — Credit Grant After Verify (2 failures)
- **Files**: `backend/tests/Feature/RegistrationAbuseTest.php`
- **Tests**: `verify email grants credits`, `normal user flow with whitelist`
- **Error**: User credits remain 0 after email verification — expects 300
- **Root Cause**: The event/listener that grants 300 credits on `email_verified_at` update may not be registered or the verification flow doesn't trigger the credit grant
- **Impact**: 2 registration flow tests fail; new users won't receive signup credits

#### 9. RenderJobPipelineTest — GPU Seconds Precision (1 failure)
- **Files**: `backend/tests/Feature/RenderJobPipelineTest.php`
- **Tests**: `handle job completion creates asset`
- **Error**: expects `gpu_seconds=8`, actual is `8.3` (float precision)
- **Root Cause**: Daemon returns fractional GPU seconds; test uses integer assertion instead of rounding or tolerance
- **Impact**: 1 pipeline test fails — minor precision issue

#### 10. ModelSelectionConflictTest — Multiplier Calculation (1 failure)
- **Files**: `backend/tests/Feature/ModelSelectionConflictTest.php`
- **Tests**: `provider pricing multiplier applied after quality multiplier`
- **Error**: expects 1681, actual is 2466
- **Root Cause**: Same base credits drift as PricingApiTest; all multiplier cascades produce higher totals
- **Impact**: 1 test fails — documentation/understanding test, not production

#### 11. PlanApiTest — Watermark Field Type (1 failure)
- **Files**: `backend/tests/Feature/PlanApiTest.php`
- **Tests**: `free plan values`
- **Error**: expects `$plan['watermark']` to be `true` (boolean), actual is `0` (integer)
- **Root Cause**: `watermark` column in DB is `integer` (0/1), not boolean; cast missing in Plan model
- **Impact**: 1 API response test fails — field type mismatch only

#### 12. AvatarUploadTest — Avatar URL Response (1 failure)
- **Files**: `backend/tests/Feature/AvatarUploadTest.php`
- **Tests**: `me returns avatar url`
- **Root Cause**: After upload, `GET /api/v1/me` doesn't return expected avatar URL format; test assertion fails
- **Impact**: 1 avatar test fails — response format mismatch

#### 13. ExampleTest — (1 failure)
- **Files**: `backend/tests/Feature/ExampleTest.php`
- **Root Cause**: Placeholder test may have environment dependency; details TBD
- **Impact**: 1 test fails

## Storyboard Analyze — CKey API Dependency
- **Issue**: `StoryboardTest > analyze storyboard` fails when CKey API is unavailable
- **Error**: `enriched_prompt` is null (no CKey API response)
- **Impact**: Only in test environment with no API keys
- **Workaround**: Run in simulation mode or ensure CKEY_API_KEY is set in Docker env

## Daemon Skills API Returns Empty
- **Symptom**: `GET /api/media/skills` returns `{"video_directions":[],...}`
- **Root Cause**: Missing skills volume mount in docker-compose or daemon not restarted
- **Fix**: Ensure `apps/skills` is mounted in daemon service, restart daemon
- **Ref**: `apps/daemon/worklogs/2026-05-28-phase1-fixes.md`

## StoryboardImagePanel — Missing Tests
- **Issue**: `StoryboardImagePanel` component (`storyboard-image-panel.tsx`) has no unit tests
- **Tracking**: Listed as remaining work in task-status.md
- **Status**: Phase 1 bug tracker item
