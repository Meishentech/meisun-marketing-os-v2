# Mobile Acceptance Checklist

Marketing OS v2 uses mobile-first acceptance. Every new feature must be usable on a phone, not only readable after shrinking the desktop UI.

## Minimum Standards

1. **No horizontal scrolling at 375px width**
   - Text must not be clipped, hidden, or overlap adjacent content.
   - Dense tables should render as labeled mobile cards.

2. **Touch targets are large enough**
   - Primary buttons, secondary buttons, inline actions, inputs, selects, and modal controls should be at least 44px high where practical.
   - If inline actions are smaller, spacing and grouping must still prevent accidental taps.

3. **Nested actions must be visually separated**
   - If a row/card contains child records with their own edit/cancel actions, each child record needs a visible boundary.
   - Users must be able to tell whether an action affects the parent item or the child item.

4. **Modal forms must be fully operable**
   - Long forms must scroll inside the mobile viewport.
   - Submit and cancel actions must remain reachable.
   - Fields must not be hidden behind fixed or modal chrome.

5. **Empty, loading, and fallback states must remain readable**
   - Mobile layouts must show the full message, not only the table shell or a clipped note.
   - Demo/fallback content must not look like live data when the system has confirmed an empty live result.

6. **Text color must be readable on its actual background**
   - Shared components used on both light and dark backgrounds need context-specific color rules.
   - Login, sidebar, modal, and cards should be checked separately.

7. **Core workflows must be exercised on mobile width**
   - For each new feature, test view, create, edit, cancel, and approval/send actions when applicable.
   - Do not accept a feature after only checking the list screen.

## Suggested Test Method

- Preview locally and test at 375 x 812.
- Capture screenshots for login, the target role page, modal forms, and final state after action.
- When login credentials are not available, test render-specific helpers directly by injecting representative HTML into the page, then inspect mobile layout.
- Verify desktop is not regressed after mobile changes.

## Required Role Coverage

- **Executive:** dashboard summaries, budget tables, approval/decision actions.
- **Marketing director:** campaign/vendor/deliverable management, association records, product knowledge, sales requests.
- **Sales:** resources, product knowledge, tenders, leads, own sales requests.
