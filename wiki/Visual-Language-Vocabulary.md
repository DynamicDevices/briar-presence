# Visual-language vocabulary and scenarios

[API work plan](Visual-Language-API.md) · [Issue #4](https://github.com/DynamicDevices/briar-presence/issues/4)

Prepared from Alex's instruction to work on the next steps, following the approved
API review. This is a proposed vocabulary for review, not adopted API enums,
implemented behaviour or proof that new users understand the lights. Examples
below are synthetic. No live work is connected.

## Selected design decisions — 10 November 2026

Alex selected the following desktop MCQ options and then instructed “lock this
in and lets carry on”. These choices supersede competing proposals in the
initial draft; they are not evidence of implemented behaviour or user testing.

| Decision | Selected behaviour |
| --- | --- |
| First glance | Whether anything needs Alex is clearest; ordinary work stays quiet and details remain inspectable. Missing information stays distinguishable. |
| Wording | Distinguish “Needs you” from “Concern”; both can apply. |
| Acknowledgement | Stop repeated pulses, but keep a steady visible concern cue at the same prominence until resolution. Acknowledgement does not resolve or authorise action. |
| Abstract face | Recognisable presence, not a status; gatherings do not imply health, listening or resolution. |
| Returning/inspection | Show unresolved requests/concerns first, then a short summary of meaningful changes since the last inspection. No automatic panel or alert replay. |
| Parallel work | Emphasise selected work; summarise other work more quietly, keeping its concerns discoverable. |
| Stronger attention | A brief bounded increase in motion/colour, then a persistent steady cue; respect reduced motion and brightness limits, with no flashing or unlimited escalation. |
| Omitted open concern | Keep it visible with a source-omission warning; accept other changes only if the snapshot is otherwise valid. Concern freshness stays separate from work freshness. |
| Changed acknowledged concern | Briefly draw attention again when impact or what the user needs to do changes; explain the change and retain acknowledgement history. Repeated/cosmetic updates do not reannounce. |

The selected steady acknowledged-concern cue must remain distinct from the
brief announcement of new stronger attention. Other work's important concerns
must not be hidden by selected focus. Snooze duration, technical material-change
comparison, severity bands and cross-display synchronisation remain unresolved.

## The questions a glance should answer

1. Is work happening, waiting, or finished?
2. Does anything need me, and why?
3. Which piece of work does that relate to?
4. Is the information current enough to rely on?

The presence offers an overview, not a dashboard encoded entirely in particles.
Clicking/inspecting should explain the relevant work in ordinary words. A person
must not have to memorise colours to discover a concern or missing information.

## Keep these meanings separate

| Meaning | Question answered | Proposed terms/examples | Does not imply |
| --- | --- | --- | --- |
| Work lifecycle | Where is this work in its execution? | Queued, running, waiting, finished | Success, acceptance or urgency |
| Activity | What kind of work is happening? | Researching, building, checking, preparing | Private reasoning or measured progress |
| Outcome | What result is actually known? | Succeeded, failed, cancelled; unknown where evidence is missing | That the person has accepted the result |
| Attention | What response is being requested? | None, information to notice, response needed, time-sensitive response | Permission to act or unlimited animation |
| Severity | How consequential is the concern? | Described impact and evidence; proposed broad bands to test | A requirement to interrupt immediately |
| Connection | Can the producer communicate? | Connected, disconnected, unavailable/unknown | Work health or fresh observations |
| Freshness | How current is this observation? | Current, stale, unknown | That stale work has stopped or succeeded |
| User focus | What has the person chosen to inspect? | An item, group or overview | Authority, priority override or shared focus for every user |

These are conceptual distinctions, not final field names or enum values.
Unfinished work normally has no outcome yet; an observation explicitly reporting
an unknown result is different from a known failure. Finished means execution has
ended, not that all concerns are resolved. Producers must not invent percentages.

Waiting needs an explicit reason and party where known: the user, another person,
an external event, or a dependency. Other independent work can continue. The
overview must not imply that all of Briar is waiting because one item is waiting.

## A small public vocabulary

Use ordinary explanations rather than forcing one label onto the entire display.
The following are proposed user-facing phrases, not mutually exclusive states.

| Phrase | Meaning | Example explanation |
| --- | --- | --- |
| Available | Nothing in the selected current view is requesting action | No work is running in this connected scope |
| Working | At least one item is making reported progress through its activity | Checking Cedar; preparing Birch |
| Waiting | Identified work cannot continue until something happens | Cedar is waiting for the test runner |
| Needs you | A specific response is requested from this user | Choose which draft to continue |
| Concern | Something remains worth addressing, with a reason | Cedar finished, but a compatibility question is open |
| Result ready | A result is available to inspect | Birch draft is ready; not yet reviewed |
| Information missing | Relevant observations are stale or unavailable | Cedar status was last received before the connection stopped |

Available must not assert verified overall safety or permanent readiness. Its use
requires a current, explicitly scoped view. With no configured producer, say
“No work source connected”, not “Everything is fine”. A partially stale view
must qualify any overview. Result-ready is not automatically success or acceptance.

“Needs you” and “Concern” can coexist, but neither implies the other: a harmless
choice may need a response, and a serious concern may already have an owner
working on it without requiring the user's immediate attention.

## Concerns and user interaction

A concern has a source: expressed by the user, reported by a producer, or raised
for investigation with evidence still missing. Do not label an expressed worry
an established fault, and do not dismiss it merely because a check passed.

| Interaction/fact | Meaning | What must remain true |
| --- | --- | --- |
| Open | The concern has not been resolved | It remains reachable alongside related work |
| Acknowledged | The person has seen it | It stays open; no action is authorised |
| Snoozed | The person temporarily quieted its presentation | The concern and its explanation remain; expiry/resurfacing policy is explicit |
| Resolved | The concern was explicitly closed with an attributed reason | Acknowledgement, success elsewhere and silence cannot manufacture resolution |
| Reopened | New information makes a resolved concern relevant again | Preserve its history and explain what changed |

Acknowledgement is per user where multiple users can view the same work. Its
effect on local signalling must be distinct from the producer-owned concern
lifecycle. Resolution permissions and concurrent updates belong in contract work.
Snoozing has no effect on the factual severity. Do not silently escalate merely
because a person has not looked at the display.

For interaction, distinguish a question waiting for an answer, a response/result
ready for inspection, and a user-selected focus. “Attending” can describe a
presentation gathering around that focus; it must not claim microphone access,
continuous listening, emotion detection or access to private reasoning.

## Synthetic acceptance scenarios

These specify expected meaning and inspection, not exact colour/motion. Visual
aggregation work will propose those expressions, subject to accessibility and
the accepted quiet clustered-light appearance.

| Scenario | Given / change | Expected overview and inspection | Must not happen |
| --- | --- | --- | --- |
| S01 Ordinary work | Cedar is building; connection and observations are current | Working; inspect shows Cedar and its activity | Fabricated percentage or success |
| S02 Concurrent work | Cedar builds, Birch checks, Willow waits on an external runner | Working with one waiting item; all three are findable | Whole presence appears stopped or allocates an unreadable permanent cluster per task |
| S03 Harmless decision | Birch needs a choice between two drafts; no concern is reported | Needs you; inspect names the choice and work | Red danger solely because an answer is needed |
| S04 Important local concern | Several items run normally; Cedar has an evidence-backed concern | Concern remains discernible and leads to Cedar's reason/impact | Healthy work averages it away or every task becomes alarming |
| S05 User-expressed worry | User asks whether Willow's plan might lose unsaved work; not yet established | Preserve the worry and need for investigation with its source | Assert a confirmed fault or reassure without evidence |
| S06 Acknowledgement/snooze | User acknowledges S04, then snoozes its signalling | Concern remains open and findable; presentation follows explicit user preference | Resolve it, authorise a repair or increase factual severity |
| S07 Finished with open concern | Cedar's checks succeed; compatibility concern remains unresolved | Result ready plus an open concern, with each fact explained | Completion clears the concern or implies acceptance |
| S08 Partial disconnect | Cedar observations expire; Birch continues reporting | Birch activity plus explicit missing/stale Cedar information | All work becomes healthy idle, failed, or disconnected by inference |
| S09 Reconnect/out-of-order | A newer Cedar snapshot arrives, then an older one | Newest accepted facts remain; old update cannot reverse resolution or freshness | Late message silently overwrites newer facts |
| S10 Focus while work changes | User inspects Birch when a concern arrives on Cedar | Birch focus remains usable; Cedar concern remains discoverable | Automatic focus theft or hidden concern |
| S11 Many items and concerns | Synthetic large set with related concerns and mixed freshness | Stable grouping/overflow with access to individual reasons and stale members | Unlimited animation, disappearing high-impact concerns or loss of identity |
| S12 Reduced motion/privacy | Reduced motion and hidden sensitive labels are selected during S04 | Equivalent explanation/non-colour cue; private labels hidden | Producer urgency overrides preferences or text leaks in inspection/logging |
| S13 No producer | First launch has no source configured | No work source connected; demo is explicitly labelled if shown | Demo blue is represented as verified real-world health |
| S14 Another user | A second isolated user inspects their own work | Their records, focus and acknowledgements only | Alex's work, another user's focus or acknowledgement leaks |
| S15 Checks miss the worry | Checks pass, but do not address the user's concern about unsaved work | Explain the coverage gap and keep the concern open | Successful unrelated checks become reassurance or resolution |
| S16 Changed acknowledged concern | A previously acknowledged concern gains materially different evidence | Preserve history; briefly reannounce only if impact or response need changes, explaining what changed | Announce cosmetic/repeated updates, imply acceptance of new facts or resolve silently |
| S17 Returning after absence | Several meaningful changes occurred while the user was away | On inspection, show unresolved requests/concerns first, then a short change summary; no automatic panel or alert replay | Replay every event or mistake last inspection for acknowledgement |
| S18 Omitted concern | Otherwise valid snapshot drops an open concern while work changes | Accept valid changes; preserve concern, source-omission warning and original concern freshness; repeated omissions do not reannounce | Refresh/resolve the omitted concern, hide it or accept unrelated invalid records |

S11's item count is a test-fixture parameter, not an adopted capacity limit.
S09 supplies requirements for future reliability tests, not evidence they run now.
S12's private inspection/logging policy must be specified in safeguards work.

## Human readability check — proposed, not performed

Show a new user ordinary work, a harmless question, an unresolved concern, and
partial missing information without first teaching a colour legend. Ask:

- What do you think is happening? Does anything need you?
- Which item would you inspect, and what would you expect to find?
- After acknowledgement, is the concern still open?
- Can you tell which information is uncertain?

Repeat with reduced motion/non-colour cues and grouped work. Record actual
answers, errors and distracting transitions; do not claim intuition from an
automated test or require an invented universal score. Adjust language and
visuals from observed confusion. This check still needs a representative study.

## Decisions still needed before freezing a contract

1. Which attention/severity bands are useful; impact, requested response and
   supported deadlines should stay explicit rather than an unexplained number.
2. How focus, acknowledgement and snooze should work across multiple displays
   and users; specify comparison for the selected impact/response-change rule
   without treating every revision as a fresh attention request.

Existing agreed direction also includes supportive/unobtrusive presentation,
parallel work, findable concerns, no false reassurance, acknowledgement not
resolution, local animation and producer independence. Apart from the explicitly
selected decisions, dimensions, mappings and study procedures remain proposals.

Issue #4 remains open for remaining semantics and readability evidence. The
selected design decisions above are settled; other proposed dimensions and API
names are not frozen. Contract (#5), aggregation (#6) and safeguards (#7) may
proceed with those distinctions explicit. No listener or live data was added.

Assisted-by: Briar
