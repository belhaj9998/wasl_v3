# مستند المتطلبات — Testing & QA

## المقدمة

يُحدد هذا المستند متطلبات بناء بنية اختبارات شاملة لمنصة Wasl SaaS (Express.js + Prisma + TypeScript). المشروع لا يحتوي حالياً على أي بنية اختبارات، ويهدف هذا المستند إلى تأسيس إطار اختبار متكامل يغطي: اختبارات الوحدة (Unit Tests)، اختبارات التكامل (Integration Tests)، واختبارات الخصائص (Property-Based Tests) باستخدام fast-check.

الأولوية تُعطى للمناطق عالية القيمة: المصادقة (Auth)، العزل متعدد المستأجرين (Multi-Tenancy)، والمنطق التجاري (Business Logic) قبل المناطق الأقل أولوية.

## المصطلحات

- **Test_Runner**: إطار تشغيل الاختبارات (Vitest)
- **Test_Database**: قاعدة بيانات PostgreSQL مخصصة للاختبارات، معزولة عن بيئة التطوير
- **Property_Test_Library**: مكتبة fast-check لاختبارات الخصائص
- **HTTP_Test_Client**: مكتبة Supertest لاختبار نقاط النهاية HTTP
- **Order_State_Machine**: آلة حالة الطلبات التي تُنفذ انتقالات الحالة الصالحة
- **Category_Tree**: هيكل شجري للتصنيفات بعمق أقصى 3 مستويات
- **Tenant_Context**: سياق المتجر المُحدد عبر header أو domain parameter
- **Auth_Middleware**: وسيط المصادقة الذي يتحقق من JWT tokens
- **Zod_Schema**: مخطط التحقق من صحة البيانات المُعرّف باستخدام مكتبة Zod
- **AppError**: فئة الأخطاء المخصصة التي تحمل HTTP status code
- **Slug_Generator**: دالة تحويل النصوص إلى URL-safe slugs
- **Order_Number_Generator**: مولد أرقام الطلبات التسلسلية بصيغة ORD-XXXX-XXXXXX

## المتطلبات

### المتطلب 1: إعداد بنية الاختبارات التحتية

**قصة المستخدم:** بصفتي مطوراً، أريد إعداد بنية اختبارات متكاملة، حتى أتمكن من كتابة وتشغيل الاختبارات بكفاءة وسرعة.

#### معايير القبول

1. THE Test_Runner SHALL use Vitest as the test framework with TypeScript support and ESM compatibility
2. THE Test_Runner SHALL resolve TypeScript path aliases matching the project's tsconfig.json configuration
3. WHEN the test suite starts, THE Test_Database SHALL be provisioned with a clean schema using Prisma migrations
4. WHEN each test file completes, THE Test_Database SHALL reset affected tables to ensure test isolation
5. THE Test_Runner SHALL provide separate configuration for unit tests (no database) and integration tests (with database)
6. WHEN running tests, THE Test_Runner SHALL generate coverage reports in lcov and text formats
7. THE Test_Runner SHALL support parallel execution for unit tests and sequential execution for integration tests
8. WHEN the `npm test` command is executed, THE Test_Runner SHALL run all test suites and return exit code 0 on success or non-zero on failure

### المتطلب 2: اختبارات وحدة الأدوات المساعدة (Utilities)

**قصة المستخدم:** بصفتي مطوراً، أريد اختبار الأدوات المساعدة بشكل شامل، حتى أضمن صحة الوظائف الأساسية التي تعتمد عليها باقي المكونات.

#### معايير القبول

1. WHEN the Slug_Generator receives any string input, THE Slug_Generator SHALL produce a lowercase output containing only alphanumeric characters and hyphens
2. WHEN the Slug_Generator receives a string with leading or trailing whitespace, THE Slug_Generator SHALL trim the whitespace and produce a valid slug without leading or trailing hyphens
3. WHEN the Slug_Generator receives an empty string or whitespace-only string, THE Slug_Generator SHALL return an empty string
4. WHEN the Order_State_Machine receives a valid current status and a valid target status, THE Order_State_Machine SHALL return true only if the transition is defined in the transition map
5. WHEN the Order_State_Machine receives a terminal status (CANCELED or RETURNED), THE Order_State_Machine SHALL return an empty array of valid transitions
6. WHEN the Order_State_Machine receives an invalid transition, THE Order_State_Machine SHALL throw an AppError with status code 400
7. WHEN the Order_Number_Generator generates a number for a store, THE Order_Number_Generator SHALL produce a string matching the format ORD-{4-digit store ID}-{6-digit sequence}
8. WHEN the Order_Number_Generator generates sequential numbers for the same store, THE Order_Number_Generator SHALL produce monotonically increasing sequence numbers
9. WHEN AppError static factory methods are called, THE AppError SHALL create instances with the correct HTTP status code and message
10. WHEN asyncHandler wraps a function that throws, THE asyncHandler SHALL forward the error to Express's next() function
11. WHEN asyncHandler wraps a function that resolves, THE asyncHandler SHALL allow the response to complete normally
12. WHEN sendSuccess is called with data and message, THE apiResponse SHALL return JSON with success:true, the provided data, and the provided message
13. WHEN sendPaginated is called with data and meta, THE apiResponse SHALL return JSON with success:true, data array, and pagination meta object

### المتطلب 3: اختبارات مخططات التحقق (Zod Validators)

**قصة المستخدم:** بصفتي مطوراً، أريد اختبار مخططات Zod للتحقق من صحة البيانات، حتى أضمن رفض المدخلات غير الصالحة قبل وصولها إلى طبقة الخدمات.

#### معايير القبول

1. WHEN the registerSchema receives valid registration data, THE registerSchema SHALL parse successfully and return the validated data
2. WHEN the registerSchema receives an invalid email format, THE registerSchema SHALL reject with a ZodError containing the email field
3. WHEN the registerSchema receives a phone number not matching the pattern `^\+?\d{7,15}$`, THE registerSchema SHALL reject with a ZodError
4. WHEN the registerSchema receives a password shorter than 8 characters or longer than 128 characters, THE registerSchema SHALL reject with a ZodError
5. WHEN the loginSchema receives an empty identifier or empty password, THE loginSchema SHALL reject with a ZodError
6. WHEN the createStoreSchema receives a domain not matching `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`, THE createStoreSchema SHALL reject with a ZodError
7. WHEN any Zod schema receives valid data matching all constraints, THE schema SHALL return the parsed output identical to the input structure
8. WHEN the validateBody middleware receives invalid request body, THE validateBody middleware SHALL pass the ZodError to the next error handler

### المتطلب 4: اختبارات تدفقات المصادقة (Auth Flows)

**قصة المستخدم:** بصفتي مطوراً، أريد اختبار جميع تدفقات المصادقة، حتى أضمن أمان النظام وصحة إدارة الجلسات.

#### معايير القبول

1. WHEN a user registers with valid unique data, THE AuthService SHALL create the user, hash the password with bcrypt, and return user profile with access and refresh tokens
2. WHEN a user registers with an existing email, THE AuthService SHALL throw an AppError with status 409 and message indicating email conflict
3. WHEN a user registers with an existing phone, THE AuthService SHALL throw an AppError with status 409 and message indicating phone conflict
4. WHEN a user logs in with valid credentials, THE AuthService SHALL verify the password, update last_login_at, and return tokens
5. WHEN a user logs in with invalid credentials, THE AuthService SHALL throw an AppError with status 401
6. WHEN a user logs in with a deactivated account, THE AuthService SHALL throw an AppError with status 403
7. WHEN a user logs out, THE AuthService SHALL revoke the refresh token from the database
8. WHEN a valid refresh token is presented, THE TokenService SHALL generate a new access token
9. WHEN an expired or invalid refresh token is presented, THE TokenService SHALL throw an AppError with status 401
10. WHEN forgotPassword is called with a non-existent email, THE AuthService SHALL return successfully without revealing email existence
11. WHEN resetPassword is called with a valid non-expired token, THE AuthService SHALL update the password and clear the reset token fields
12. WHEN resetPassword is called with an expired token, THE AuthService SHALL throw an AppError with status 400
13. WHEN changePassword is called with incorrect current password, THE AuthService SHALL throw an AppError with status 401
14. WHEN the Auth_Middleware verifies a valid JWT token, THE Auth_Middleware SHALL attach user context (userId, systemRole) to the request
15. WHEN the Auth_Middleware receives no token or an invalid token, THE Auth_Middleware SHALL call next with an AppError status 401

### المتطلب 5: اختبارات العزل متعدد المستأجرين (Multi-Tenant Isolation)

**قصة المستخدم:** بصفتي مطوراً، أريد اختبار عزل البيانات بين المتاجر، حتى أضمن عدم تسرب بيانات متجر إلى متجر آخر.

#### معايير القبول

1. WHEN resolveStoreContext receives a valid x-store-id header, THE Auth_Middleware SHALL verify membership and attach storeId, storeRole, and permissions to the request
2. WHEN resolveStoreContext receives an x-store-id for a store the user is not a member of, THE Auth_Middleware SHALL return status 403
3. WHEN resolveStoreContext receives an x-store-id for a SUSPENDED or ARCHIVED store, THE Auth_Middleware SHALL return status 403
4. WHEN resolveStoreContext receives an x-store-id for a user with INACTIVE membership, THE Auth_Middleware SHALL return status 403
5. WHEN requirePermission checks a permission the user does not have, THE Auth_Middleware SHALL return status 403
6. WHEN the storefrontTenantMiddleware receives a valid domain, THE storefrontTenantMiddleware SHALL resolve the store and attach store context to the request
7. WHEN the storefrontTenantMiddleware receives a domain for a non-existent store, THE storefrontTenantMiddleware SHALL return AppError with status 404
8. WHEN the storefrontTenantMiddleware receives a domain for a DRAFT, SUSPENDED, or ARCHIVED store, THE storefrontTenantMiddleware SHALL return AppError with status 403
9. WHEN a service performs a query scoped to storeId, THE service SHALL only return records belonging to that store
10. WHEN BaseService is instantiated with a storeId, THE BaseService SHALL include store_id in all query where clauses

### المتطلب 6: اختبارات المنطق التجاري — شجرة التصنيفات (Category Tree)

**قصة المستخدم:** بصفتي مطوراً، أريد اختبار عمليات شجرة التصنيفات، حتى أضمن صحة الهيكل الشجري ومنع المراجع الدائرية.

#### معايير القبول

1. WHEN buildCategoryTree receives a flat list of categories, THE CategoryService SHALL produce a nested tree where each node's children array contains only its direct children
2. WHEN buildCategoryTree receives categories with sort_order values, THE CategoryService SHALL sort children at each level by sort_order ascending
3. WHEN creating a category with a parent_id, THE CategoryService SHALL validate that the resulting depth does not exceed 3 levels
4. WHEN creating a category with a non-existent parent_id in the same store, THE CategoryService SHALL throw AppError with status 404
5. WHEN updating a category's parent_id to itself, THE CategoryService SHALL throw AppError with status 400 indicating circular reference
6. WHEN updating a category's parent_id to one of its descendants, THE CategoryService SHALL throw AppError with status 400 indicating circular reference
7. WHEN deleting a category with children, THE CategoryService SHALL reassign children to the deleted category's parent
8. WHEN reordering categories, THE CategoryService SHALL validate all IDs exist in the store and check for circular references and depth limits
9. WHEN ensureUniqueSlug encounters a duplicate slug in the same store, THE CategoryService SHALL append a numeric suffix to create a unique slug

### المتطلب 7: اختبارات المنطق التجاري — آلة حالة الطلبات (Order State Machine)

**قصة المستخدم:** بصفتي مطوراً، أريد اختبار آلة حالة الطلبات بشكل شامل، حتى أضمن أن انتقالات الحالة تتبع القواعد المحددة بدقة.

#### معايير القبول

1. WHEN canTransition is called with any status pair, THE Order_State_Machine SHALL return true only if the target status is in the allowed transitions list for the source status
2. WHEN canTransition is called with a terminal status (CANCELED, RETURNED) as source, THE Order_State_Machine SHALL always return false regardless of target
3. WHEN getValidTransitions is called for any status, THE Order_State_Machine SHALL return a new array (not a reference to the internal state) of allowed target statuses
4. WHEN assertTransition is called with an invalid transition, THE Order_State_Machine SHALL throw AppError with status 400 containing both source and target status names in the message
5. FOR ALL valid status pairs defined in the transition map, THE Order_State_Machine canTransition SHALL return true
6. FOR ALL status pairs NOT defined in the transition map, THE Order_State_Machine canTransition SHALL return false

### المتطلب 8: اختبارات التكامل — نقاط النهاية (API Integration Tests)

**قصة المستخدم:** بصفتي مطوراً، أريد اختبار نقاط النهاية من طرف إلى طرف، حتى أضمن صحة سلسلة المعالجة الكاملة من الطلب إلى الاستجابة.

#### معايير القبول

1. WHEN a POST /api/auth/register request is sent with valid data, THE API SHALL return status 201 with user object and accessToken in body and refresh_token cookie
2. WHEN a POST /api/auth/login request is sent with valid credentials, THE API SHALL return status 200 with user object and accessToken
3. WHEN a protected endpoint is accessed without Authorization header, THE API SHALL return status 401
4. WHEN a store-admin endpoint is accessed with valid token and x-store-id, THE API SHALL process the request within the correct store context
5. WHEN a store-admin endpoint is accessed with x-store-id for a store the user has no membership in, THE API SHALL return status 403
6. WHEN a storefront endpoint is accessed with a valid domain parameter, THE API SHALL resolve the store and process the request
7. WHEN the error handler receives an AppError, THE API SHALL return the corresponding status code and error message in the standard response format
8. WHEN the error handler receives a Prisma P2002 error, THE API SHALL return status 409 with a unique constraint violation message
9. WHEN the error handler receives a ZodError, THE API SHALL return status 422 with validation error details
10. WHEN the error handler receives an unknown error, THE API SHALL return status 500 with a generic error message

### المتطلب 9: اختبارات الخصائص (Property-Based Tests)

**قصة المستخدم:** بصفتي مطوراً، أريد استخدام اختبارات الخصائص لاكتشاف حالات حدية غير متوقعة، حتى أزيد من ثقتي في صحة المنطق الأساسي.

#### معايير القبول

1. FOR ALL arbitrary strings, THE Slug_Generator SHALL produce output that is idempotent: slugify(slugify(x)) equals slugify(x)
2. FOR ALL arbitrary strings, THE Slug_Generator SHALL produce output containing only characters matching `^[a-z0-9-]*$`
3. FOR ALL valid ShipmentStatus pairs where canTransition returns true, THE Order_State_Machine assertTransition SHALL not throw
4. FOR ALL valid ShipmentStatus pairs where canTransition returns false, THE Order_State_Machine assertTransition SHALL throw AppError
5. FOR ALL valid registration data objects, THE registerSchema SHALL parse successfully and the output SHALL contain all required fields
6. FOR ALL strings composed entirely of whitespace, THE Slug_Generator SHALL return an empty string
7. FOR ALL valid store IDs and sequence numbers, THE Order_Number_Generator SHALL produce output matching the regex `^ORD-\d{4}-\d{6}$`
8. FOR ALL flat category lists with valid parent references, THE buildCategoryTree SHALL produce a tree where the total node count equals the input list length
9. FOR ALL category trees produced by buildCategoryTree, every node's children SHALL have sort_order values in non-decreasing order
10. THE Property_Test_Library SHALL run each property test for a minimum of 100 iterations

### المتطلب 10: اختبارات معالجة الأخطاء (Error Handling)

**قصة المستخدم:** بصفتي مطوراً، أريد اختبار معالجة الأخطاء المركزية، حتى أضمن أن جميع أنواع الأخطاء تُعالج بشكل صحيح ومتسق.

#### معايير القبول

1. WHEN errorHandler receives an AppError instance, THE errorHandler SHALL respond with the AppError's statusCode and message
2. WHEN errorHandler receives a Prisma error with code P2002, THE errorHandler SHALL respond with status 409 and include the conflicting field name
3. WHEN errorHandler receives a Prisma error with code P2025, THE errorHandler SHALL respond with status 404
4. WHEN errorHandler receives a ZodError, THE errorHandler SHALL respond with status 422 and include the validation issues array
5. WHEN errorHandler receives an unknown error type, THE errorHandler SHALL respond with status 500 and a generic message without exposing internal details
6. WHEN AppError.badRequest is called without arguments, THE AppError SHALL have statusCode 400 and default message "Bad request"
7. WHEN AppError.internal is called, THE AppError SHALL have isOperational set to false
