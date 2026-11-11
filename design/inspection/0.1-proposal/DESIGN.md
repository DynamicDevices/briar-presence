# Work inspection — proposal, not accepted interaction

The accepted face remains the quiet default. This proposal answers: “Where
should I look?” when several things are running and one needs attention.
It does not replace the face or claim new live harness support.

Generate the self-contained proposal from `implementation/` with
`node scripts/inspection-mockup.mjs`, then open
`test-artifacts/inspection-mockup.html`. This does not start a server or show a
window automatically. Keep the accepted `embedded-api-preview.html` alongside
it for comparison; neither generation changes the installed display.

## Proposed interaction

Click/tap or keyboard-activate the face to open a pale, rounded panel beside it,
not a harsh window over it. Keep the face visible and moving. The panel closes
on Escape or its on-demand close button, returning keyboard focus to the face.
No permanent buttons, badges or dashboard are added to the closed face.

The first view says how many tasks, unresolved concerns and response requests
are known. Counts are separate: a concern and its related response request are
not two problems. Concern-bearing tasks appear before quiet tasks in the
overview, without changing the user's accepted shared focus or forcing a task
to open. A local inspection selection must not silently become shared focus.

Each work row has its plain-language label and lifecycle, concern/request
counts and source freshness. Activating it reveals related concerns and
requests with impact, evidence, uncertainty and the reason a response is
needed. Do not rely on colour or motion alone. Work success cannot close an
unresolved concern; acknowledgement means “seen”, not “fixed”.

The mock-up's demonstration controls explicitly choose prerecorded accepted
states. They do not invoke live actions, resolve real concerns or set shared
focus. Production actions require the real API's current revision checks,
permission binding and error handling; do not ship fake optimistic success.

## Boundaries and layout

- Panel placement must fit the available viewport; on a narrow screen it
  goes below the face rather than covering it. Actual overlay positioning,
  multi-display coordinates and native input routing are later host checks.
- The face's click-to-open and drag-to-move must be distinguished by movement
  threshold in a desktop host. Corner resize takes priority at the edge; no
  visible resize control is proposed. This browser mock-up is not that host.
- Source expiry must visibly say “Source unavailable — status unknown”. It
  must not display a healthy/finished summary from old facts. Retain unresolved
  concerns and show freshness limits. Resuming a source cannot replay old focus.
- Preserve reduced motion, brightness, text contrast, visible keyboard focus
  and non-colour labels. Do not automatically open the panel or steal focus
  when a concern arrives. Do not announce per-frame animation to screen readers.
- Synthetic policy values and sample timestamps are demonstration values,
  not new default timing/rate/retention limits for future users.

## Acceptance to try with Alex

Can Alex identify the affected task and distinguish possible from confirmed
impact? Can they acknowledge without mistaking it for resolution? Do quiet
tasks remain inspectable? Does expiry look unknown rather than successful?
Does the closed face remain unobtrusive, with no always-visible controls?

Automated mock-up tests establish only recorded-state provenance, DOM
behaviour and renderer execution, not human usability or desktop acceptance.

Assisted-by: Briar
