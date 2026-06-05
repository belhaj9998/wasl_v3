# Requirements Document

## Introduction

This feature delivers a reusable, presentation-only React component named `SmartTimestamp` for the Store Admin and Storefront frontend. The component renders a single timestamp in a "smart" form whose visible text adapts to how recent the date is: relative hours for ages under 24 hours, relative days for ages under 7 days, and an absolute `YYYY-MM-DD` date for ages of 7 days or more. A tooltip on hover or focus always reveals the full date and time formatted in the store timezone (default `Africa/Tripoli`) with a 12-hour `hh:mm a` clock and a locale-appropriate weekday and month name. The component is bilingual (Arabic primary, English secondary), pure (no Redux, no React context dependency), and static (no timers, no auto-refresh, no effects that re-render over time), so it is safe to use thousands of times inside table rows.

The work also extends the existing date utility module at `Apps/src/lib/utils/formatDate.ts` with two new pure helpers, `formatSmartDate` and `formatFullDateTime`, that encapsulate the formatting logic and that the component consumes. The shadcn `Tooltip` primitives at `Apps/src/components/ui/tooltip.tsx` are used as-is for the hover surface. This spec covers only the helpers and the component; integration into the orders table or any other page is explicitly out of scope and deferred to a future spec.

## Glossary

- **SmartTimestamp**: The new client React component at `Apps/src/components/shared/SmartTimestamp.tsx` that renders a smart, locale-aware timestamp with a full date-time tooltip.
- **FormatSmartDate**: The new pure helper `formatSmartDate(date, locale)` exported from `Apps/src/lib/utils/formatDate.ts` that returns the visible text for the SmartTimestamp.
- **FormatFullDateTime**: The new pure helper `formatFullDateTime(date, locale, timezone)` exported from `Apps/src/lib/utils/formatDate.ts` that returns the tooltip text for the SmartTimestamp.
- **DateInput**: The accepted input value for FormatSmartDate, FormatFullDateTime, and the SmartTimestamp `date` prop. DateInput is a value of type `string | Date | number | null | undefined`. String values are ISO-8601 strings parsed via `parseISO`; number values are Unix epoch milliseconds.
- **Locale**: The interface language; either the literal `"ar"` or the literal `"en"`. Drives translation, weekday and month names, AM/PM rendering, and digit shaping where date-fns supports it.
- **StoreTimezone**: The IANA timezone string used for tooltip rendering. Default value is `"Africa/Tripoli"`.
- **NowReference**: The current wall-clock instant captured exactly once at the time FormatSmartDate is called; equals `new Date()` at call time.
- **AgeMs**: The non-negative difference `NowReference - DateInput` measured in milliseconds. AgeMs is `0` whenever DateInput is at or after NowReference.
- **HoursWindow**: The age range `0 <= AgeMs < 86_400_000` (strictly less than 24 hours).
- **DaysWindow**: The age range `86_400_000 <= AgeMs < 604_800_000` (at least 24 hours and strictly less than 7 days).
- **AbsoluteWindow**: The age range `AgeMs >= 604_800_000` (7 days or more).
- **FutureWindow**: The condition where DateInput is strictly greater than NowReference.
- **InvalidDate**: A DateInput that is `null`, `undefined`, an empty string, a string that fails `parseISO`, a `Date` object whose `isValid` check returns false, or any other value that cannot be coerced to a finite epoch milliseconds value.
- **TooltipSurface**: The shadcn-based hover and focus surface composed of `Tooltip`, `TooltipTrigger`, and `TooltipContent` from `Apps/src/components/ui/tooltip.tsx`.
- **VisibleText**: The text rendered inside the SmartTimestamp trigger element; equal to the FormatSmartDate output for the given DateInput and Locale.
- **TooltipText**: The text rendered inside the TooltipSurface; equal to the FormatFullDateTime output for the given DateInput, Locale, and StoreTimezone.

## Requirements

### Requirement 1: FormatSmartDate helper - signature and exports

**User Story:** As a frontend engineer, I want a single pure helper that returns the smart visible text for any date, so that the component and any future caller share one source of truth.

#### Acceptance Criteria

1. THE FormatSmartDate SHALL be exported from `Apps/src/lib/utils/formatDate.ts` as a named export.
2. THE FormatSmartDate SHALL accept exactly two parameters: `date` of type `string | Date | number | null | undefined` and `locale` of type `"ar" | "en"`.
3. THE FormatSmartDate SHALL return a value of type `string`.
4. THE FormatSmartDate SHALL be a pure function; THE FormatSmartDate SHALL NOT read or write module-level mutable state, SHALL NOT call `setInterval` or `setTimeout`, and SHALL NOT perform any I/O.
5. THE FormatSmartDate SHALL capture NowReference exactly once per call by reading `new Date()` once at the start of the call.

### Requirement 2: FormatSmartDate helper - HoursWindow branch

**User Story:** As a store admin, I want timestamps under 24 hours old to read like "2 hours ago" or "قبل ساعتين", so that I can immediately see how recent the activity is.

#### Acceptance Criteria

1. WHEN AgeMs is in HoursWindow, THE FormatSmartDate SHALL return the result of `formatDistanceToNow(parsedDate, { addSuffix: true, locale })` where `locale` is the date-fns `ar` locale when Locale equals `"ar"` and the date-fns default English locale when Locale equals `"en"`.
2. WHEN AgeMs is in HoursWindow and Locale equals `"ar"`, THE FormatSmartDate SHALL return Arabic text containing an Arabic-language past-tense suffix (for example `"قبل ساعتين"` or `"قبل 5 ساعات"`).
3. WHEN AgeMs is in HoursWindow and Locale equals `"en"`, THE FormatSmartDate SHALL return English text containing the suffix `" ago"` (for example `"2 hours ago"`).
4. THE FormatSmartDate SHALL NOT add or remove any character to the date-fns output for HoursWindow beyond what date-fns itself returns.

### Requirement 3: FormatSmartDate helper - DaysWindow branch

**User Story:** As a store admin, I want timestamps between 1 and 7 days old to read like "3 days ago" or "قبل 4 أيام", so that recent-but-not-today activity is still scannable at a glance.

#### Acceptance Criteria

1. WHEN AgeMs is in DaysWindow, THE FormatSmartDate SHALL return the result of `formatDistanceToNow(parsedDate, { addSuffix: true, locale })` where `locale` is the date-fns `ar` locale when Locale equals `"ar"` and the date-fns default English locale when Locale equals `"en"`.
2. WHEN AgeMs is in DaysWindow and Locale equals `"ar"`, THE FormatSmartDate SHALL return Arabic text using day-based wording such as `"أمس"`, `"قبل يومين"`, or `"قبل 4 أيام"`.
3. WHEN AgeMs is in DaysWindow and Locale equals `"en"`, THE FormatSmartDate SHALL return English text using day-based wording such as `"yesterday"` or `"3 days ago"`.

### Requirement 4: FormatSmartDate helper - AbsoluteWindow branch

**User Story:** As a store admin, I want timestamps that are 7 days old or older to render as a clean ISO-style date with no time, so that older entries are unambiguous and easy to scan.

#### Acceptance Criteria

1. WHEN AgeMs is in AbsoluteWindow, THE FormatSmartDate SHALL return `format(parsedDate, "yyyy-MM-dd")` from date-fns.
2. WHEN AgeMs is in AbsoluteWindow, THE FormatSmartDate SHALL NOT include any hour, minute, second, or AM/PM segment in the returned text.
3. THE FormatSmartDate SHALL produce the same `YYYY-MM-DD` calendar date for AbsoluteWindow regardless of whether Locale equals `"ar"` or `"en"`.

### Requirement 5: FormatSmartDate helper - FutureWindow branch

**User Story:** As a store admin, I want a future-dated timestamp to render in a calm, predictable form, so that the UI does not produce confusing "in 3 days" wording inside row metadata.

#### Acceptance Criteria

1. WHEN DateInput is in FutureWindow and Locale equals `"en"`, THE FormatSmartDate SHALL return the literal string `"Just now"`.
2. WHEN DateInput is in FutureWindow and Locale equals `"ar"`, THE FormatSmartDate SHALL return the literal string `"الآن"`.
3. THE FormatSmartDate SHALL treat any DateInput strictly greater than NowReference as FutureWindow regardless of how far in the future the value is.

### Requirement 6: FormatSmartDate helper - invalid input handling

**User Story:** As a frontend engineer, I want the helper to never throw on bad input, so that a single malformed value does not crash an entire table row.

#### Acceptance Criteria

1. IF DateInput is an InvalidDate, THEN THE FormatSmartDate SHALL return the literal empty string `""`.
2. THE FormatSmartDate SHALL NOT throw any exception for any value of DateInput; THE FormatSmartDate SHALL convert internal failures into the empty string return value.
3. WHEN DateInput is a string, THE FormatSmartDate SHALL parse the string with `parseISO` from date-fns.
4. WHEN DateInput is a number, THE FormatSmartDate SHALL treat the number as Unix epoch milliseconds and SHALL build a `Date` from that value.
5. WHEN DateInput is a `Date` instance, THE FormatSmartDate SHALL use the instance directly.

### Requirement 7: FormatFullDateTime helper - signature and exports

**User Story:** As a frontend engineer, I want a single pure helper that returns the full tooltip text for any date in a chosen timezone, so that the tooltip rendering matches across all callers.

#### Acceptance Criteria

1. THE FormatFullDateTime SHALL be exported from `Apps/src/lib/utils/formatDate.ts` as a named export.
2. THE FormatFullDateTime SHALL accept exactly three parameters: `date` of type `string | Date | number | null | undefined`, `locale` of type `"ar" | "en"`, and `timezone` of type `string`.
3. THE FormatFullDateTime SHALL return a value of type `string`.
4. THE FormatFullDateTime SHALL be a pure function; THE FormatFullDateTime SHALL NOT read or write module-level mutable state and SHALL NOT perform any I/O.

### Requirement 8: FormatFullDateTime helper - Arabic format

**User Story:** As an Arabic-speaking store admin, I want the tooltip to show the full weekday, day, month, year, and 12-hour time in Arabic with AM/PM, so that I can read the exact moment in my native language.

#### Acceptance Criteria

1. WHEN Locale equals `"ar"`, THE FormatFullDateTime SHALL return a string of the form `"<weekday> <day> <month> <year> | <hh>:<mm> <am/pm>"` using the date-fns `ar` locale.
2. WHEN Locale equals `"ar"` and the wall-clock time in StoreTimezone is `02:37` PM, THE FormatFullDateTime SHALL render the time segment as `"02:37 م"`.
3. WHEN Locale equals `"ar"` and the wall-clock time in StoreTimezone is `02:37` AM, THE FormatFullDateTime SHALL render the time segment as `"02:37 ص"`.
4. WHEN Locale equals `"ar"`, THE FormatFullDateTime SHALL use the date-fns time format token `"hh:mm a"` for the time segment.

### Requirement 9: FormatFullDateTime helper - English format

**User Story:** As an English-speaking store admin, I want the tooltip to show the full weekday, month name, day, year, and 12-hour time in English with AM/PM, so that I can read the exact moment in my native language.

#### Acceptance Criteria

1. WHEN Locale equals `"en"`, THE FormatFullDateTime SHALL return a string of the form `"<Weekday>, <Month> <day>, <year> | <hh>:<mm> <AM/PM>"` using the date-fns default English locale.
2. WHEN Locale equals `"en"` and the wall-clock time in StoreTimezone is 14:37, THE FormatFullDateTime SHALL render the time segment as `"02:37 PM"`.
3. WHEN Locale equals `"en"` and the wall-clock time in StoreTimezone is 02:37, THE FormatFullDateTime SHALL render the time segment as `"02:37 AM"`.
4. WHEN Locale equals `"en"`, THE FormatFullDateTime SHALL use the date-fns time format token `"hh:mm a"` for the time segment.

### Requirement 10: FormatFullDateTime helper - timezone handling

**User Story:** As a store admin in Libya, I want the tooltip to read in the store timezone regardless of where the browser is running, so that I always see the same wall-clock value as my colleagues.

#### Acceptance Criteria

1. THE FormatFullDateTime SHALL render the date and time using the calendar fields of `timezone` produced by `Intl.DateTimeFormat` with the `timeZone` option set to `timezone`.
2. WHEN `timezone` equals `"Africa/Tripoli"` and DateInput equals the UTC instant `2025-12-26T13:37:00Z`, THE FormatFullDateTime SHALL render `"02:37 م"` for Locale `"ar"` and `"02:37 PM"` for Locale `"en"` (Africa/Tripoli is UTC+02:00 with no DST, so 13:37 UTC equals 15:37 local; the example tracks the actual zone offset).
3. IF `timezone` is not a valid IANA timezone identifier, THEN THE FormatFullDateTime SHALL fall back to `"Africa/Tripoli"` as the rendering timezone.
4. THE FormatFullDateTime SHALL NOT use the browser's local timezone, the system locale, or any environment variable to choose the rendering timezone.

### Requirement 11: FormatFullDateTime helper - invalid input handling

**User Story:** As a frontend engineer, I want the tooltip helper to never throw, so that a malformed value cannot break the tooltip surface.

#### Acceptance Criteria

1. IF DateInput is an InvalidDate, THEN THE FormatFullDateTime SHALL return the literal empty string `""`.
2. THE FormatFullDateTime SHALL NOT throw any exception for any value of DateInput; THE FormatFullDateTime SHALL convert internal failures into the empty string return value.
3. WHEN DateInput is a string, THE FormatFullDateTime SHALL parse the string with `parseISO` from date-fns.
4. WHEN DateInput is a number, THE FormatFullDateTime SHALL treat the number as Unix epoch milliseconds.
5. WHEN DateInput is a `Date` instance, THE FormatFullDateTime SHALL use the instance directly.

### Requirement 12: SmartTimestamp component - props contract

**User Story:** As a frontend engineer, I want a small, predictable props contract for the component, so that any caller can drop it into a row without wiring extra context.

#### Acceptance Criteria

1. THE SmartTimestamp SHALL accept a required prop `date` of type `string | Date | number | null | undefined`.
2. THE SmartTimestamp SHALL accept an optional prop `locale` of type `"ar" | "en"`.
3. THE SmartTimestamp SHALL accept an optional prop `timezone` of type `string` whose default value is `"Africa/Tripoli"`.
4. THE SmartTimestamp SHALL accept an optional prop `className` of type `string` that is forwarded to the rendered trigger element.
5. THE SmartTimestamp SHALL NOT accept any prop that requires a Redux store, a React context provider, or a server-only API.
6. WHERE the `locale` prop is omitted, THE SmartTimestamp SHALL fall back to the value returned by the `useLocale` hook from `next-intl` and SHALL coerce that value to `"ar"` when the hook reports a value other than `"en"`.

### Requirement 13: SmartTimestamp component - rendering structure

**User Story:** As a designer, I want the component to render a single visible text element wrapped in a tooltip, so that it fits inside dense table rows without altering layout.

#### Acceptance Criteria

1. WHEN DateInput is not an InvalidDate, THE SmartTimestamp SHALL render a TooltipSurface whose `TooltipTrigger` contains a `<span>` element holding VisibleText.
2. THE SmartTimestamp SHALL set TooltipText as the `TooltipContent` text content.
3. THE SmartTimestamp SHALL render the trigger as a non-interactive inline element so that the surrounding row click target is preserved.
4. WHERE the `className` prop is provided, THE SmartTimestamp SHALL append the `className` value to the `<span>` trigger via the project's `cn` utility.
5. THE SmartTimestamp SHALL NOT render a `TooltipProvider`; THE SmartTimestamp SHALL rely on a `TooltipProvider` mounted at a higher layer of the application.

### Requirement 14: SmartTimestamp component - tooltip behavior

**User Story:** As a keyboard user, I want the tooltip to open on focus as well as hover, so that I can read the full date without a pointer.

#### Acceptance Criteria

1. WHEN the user hovers the trigger with a pointer, THE SmartTimestamp SHALL display the TooltipSurface with TooltipText.
2. WHEN the trigger receives keyboard focus, THE SmartTimestamp SHALL display the TooltipSurface with TooltipText.
3. WHEN the trigger loses hover and focus, THE SmartTimestamp SHALL hide the TooltipSurface.
4. THE SmartTimestamp SHALL NOT alter the default open or close delays of the shadcn `Tooltip` primitives.

### Requirement 15: SmartTimestamp component - accessibility

**User Story:** As an assistive-technology user, I want the full date and time to be announced even when the visible text is a relative phrase, so that I get the same information as a sighted user.

#### Acceptance Criteria

1. THE SmartTimestamp SHALL set the trigger `<span>` `aria-label` attribute equal to TooltipText.
2. THE SmartTimestamp SHALL set the trigger `<span>` `title` attribute equal to TooltipText as a fallback for environments without tooltip portal support.
3. WHEN DateInput is not an InvalidDate, THE SmartTimestamp SHALL set the trigger `<span>` `tabIndex` to `0` so that keyboard focus can reveal the tooltip.
4. THE SmartTimestamp SHALL NOT use `role="tooltip"` directly on the trigger; THE SmartTimestamp SHALL rely on the shadcn `TooltipContent` element to provide the tooltip role.

### Requirement 16: SmartTimestamp component - invalid date rendering

**User Story:** As a frontend engineer, I want a graceful fallback for missing or malformed timestamps, so that broken data degrades to a calm visual placeholder instead of a crash.

#### Acceptance Criteria

1. IF DateInput is an InvalidDate, THEN THE SmartTimestamp SHALL render a single `<span>` containing the literal string `"—"` and SHALL NOT render a TooltipSurface.
2. IF DateInput is an InvalidDate, THEN THE SmartTimestamp SHALL set the trigger `<span>` `aria-label` to the literal string `"—"`.
3. THE SmartTimestamp SHALL NOT throw any exception when DateInput is an InvalidDate.

### Requirement 17: SmartTimestamp component - static behavior

**User Story:** As a frontend engineer, I want the component to compute its values once and never refresh on a timer, so that putting it into a 200-row table does not register hundreds of intervals.

#### Acceptance Criteria

1. THE SmartTimestamp SHALL compute VisibleText and TooltipText exactly once per mount during the initial render.
2. THE SmartTimestamp SHALL NOT call `setInterval`, `setTimeout`, `requestAnimationFrame`, `requestIdleCallback`, or any other scheduling API.
3. THE SmartTimestamp SHALL NOT register any `useEffect` or `useLayoutEffect` whose body schedules a future re-render.
4. WHEN the `date`, `locale`, or `timezone` prop changes between renders, THE SmartTimestamp SHALL recompute VisibleText and TooltipText for the new prop values.
5. THE SmartTimestamp SHALL NOT hold any internal `useState` other than what is strictly required to integrate with the shadcn `Tooltip` primitives (the shadcn primitives manage their own open state internally).

### Requirement 18: SmartTimestamp component - performance constraints

**User Story:** As a frontend engineer, I want the component to be cheap enough to render once per row in a long table, so that scrolling and pagination remain smooth.

#### Acceptance Criteria

1. THE SmartTimestamp SHALL NOT mount any per-instance subscription, timer, observer, or event listener on `window`, `document`, or `navigator`.
2. THE SmartTimestamp SHALL delegate all date math to FormatSmartDate and FormatFullDateTime so that no heavy computation happens inside the component body.
3. THE SmartTimestamp SHALL be safe to render at least 200 times on the same page without producing console warnings about effect or timer leaks under React's strict mode.

### Requirement 19: Locale resolution rules

**User Story:** As a developer integrating the component, I want a clear and predictable way to choose the language, so that consumers do not have to guess between an explicit prop and the global locale.

#### Acceptance Criteria

1. WHEN the `locale` prop is provided with the value `"ar"` or `"en"`, THE SmartTimestamp SHALL pass that value through to FormatSmartDate and FormatFullDateTime.
2. WHEN the `locale` prop is omitted, THE SmartTimestamp SHALL read the locale from the `useLocale` hook from `next-intl`.
3. IF the value read from `useLocale` is not `"en"`, THEN THE SmartTimestamp SHALL coerce that value to `"ar"` before passing it to FormatSmartDate and FormatFullDateTime.
4. THE SmartTimestamp SHALL NOT read the document `dir` attribute, the HTML `lang` attribute, or `navigator.language` to choose the locale.

### Requirement 20: Module placement and integration scope

**User Story:** As a maintainer, I want the new code to live in the agreed locations and to leave the existing utility surface untouched, so that the codebase remains predictable.

#### Acceptance Criteria

1. THE FormatSmartDate and FormatFullDateTime helpers SHALL be added to the existing file `Apps/src/lib/utils/formatDate.ts` as new named exports.
2. THE existing exports `formatDate`, `formatRelativeDate`, and `formatDateTime` from `Apps/src/lib/utils/formatDate.ts` SHALL retain their current names, signatures, and runtime behavior.
3. THE SmartTimestamp component SHALL be created as a new file at `Apps/src/components/shared/SmartTimestamp.tsx` and SHALL begin with the `"use client"` directive.
4. THIS spec SHALL NOT modify `OrdersPageClient.tsx`, any orders table component, or any other consumer page; integration into specific pages is deferred to a future spec.
