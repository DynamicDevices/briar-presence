# Decisions and proposals

Source: Alex's direct instructions in the Briar face-design chat,
10 November 2026. This record captures product direction, not execution authority.

## Agreed requirements

| ID | Requirement | User-authored basis |
| --- | --- | --- |
| D01 | Explore clustered light rather than line-led graphics | “I prefer the idea of the groupings of lights that the robot face uses in lost in space” |
| D02 | Reflect our work and interaction, not generic activity | “It also needs to reflect better the work briar does and the interaction with me” |
| D03 | Address worries and concerns | “we also need to deal with when there are worries and concerns we need to address” |
| D04 | Be intuitive for Alex and future users | “I want this to be intuitive for me and for other users in future” |
| D05 | Direct attention to problems across concurrent work | “We also work on a number of things at any time so we need a way to direct to where there might be problms” |
| D06 | Use a staged iterative plan | “we should specify a plan to work through this as it's going to need some iterations”; “do this please” |
| D07 | Keep design separate from implementation | “I want to separate the design concepts we come up with from the actual implementation” |
| D08 | Laptop first, non-intrusive and glanceable | “Initially I want to see something on my laptop that is non-intrusive but I can look at to see how things are going” |
| D09 | Consider desk-device and VR uses later | “In future we might build this into a physical device on my desk and perhaps add this into VR” |
| D10 | Support future headless-harness users | “I also want to be able to use this in future for other users who work with the briar headless harness” |
| D11 | Create a dedicated DD repository | “I think you should create a new DD repo for this work” |
| D12 | Develop Cloudlets with fine granular detail as the next appearance study | Alex selected “Combine Cloudlets + fine granular detail” in the desktop visual-review question on 10 November 2026; final appearance and motion remain unapproved |
| D13 | Explore the hybrid in a simulated motion study | Alex selected “Explore this appearance in motion” in the desktop review on 10 November 2026; this is not final motion acceptance |
| D14 | Sometimes let the lights coalesce into an abstract face | “ok and it would be good for sometimes it to come together like an abstract face”; this supersedes the earlier proposed exclusion of all facial suggestion |
| D15 | Preserve the hybrid light material and current motion study as the accepted starting baseline | “ok this is a good start - lock this in”; this accepts an exploratory baseline, not a final design, verified browser behaviour or live integration |

## Briar's proposals: not settled design

The following later instructions are also locked into the project record:

| ID | Decision or requirement | Alex's instruction / acceptance |
| --- | --- | --- |
| D16 | Continuous randomised movement, including independent light wandering | “it should loop with some randomisation”; “I would like a bit more randomised movement” |
| D17 | Remove the oval enclosure; use a friendlier, more-rounded backing when needed | “I don't like the oval - it's too basic”; “the shape of the briar rectangle to be more friendly - maybe more rounded” |
| D18 | Hide controls at rest; reveal them by clicking the image | “I don't want to see the buttons unless I click on the Briar image” |
| D19 | The whole experience must be supportive and unobtrusive; no harsh black controls panel over the face | “Everything we do here must be supportive and unobtrusive”; “I don't want the black window to appear on top of the briar face - it's too harsh” |
| D20 | Use the supplied Briar portrait as the abstract face's shape/expression reference | “use the Briar face you chose as the basis for the shape of the face when you show it”; “lock this into the wiki too” |
| D21 | Make moving the native window easy from the image interaction | “I want to be able to click on the Briar face and move the window easily” |
| D22 | Keep a wiki of the direction and work, distinguishing decisions from unfinished experiments | “lock all this in so far and update a wiki with our work so we can keep track” |
| D23 | Investigate graded attention using faster motion, stronger colour and possible red transitions | “The more it needs to attract my attention the faster and the more coloured - probably changing back and forth to a red colour but you investigate options”; no specific mapping is accepted yet |
| D24 | Develop an easy desktop overlay while preserving portability | “build this into something we can overlay on the desktop easily but also architect so we can move this to other platforms”; “set this as the goal” |

See [the wiki](../wiki/Home.md) for the portrait reference and current evidence.
These requirements do not accept an untested toolkit, an exact attention palette,
compositor behaviour, resource cost or a production release. The portrait-derived
light map is not yet implemented. The separate settings window is a current
implementation proposal; actual non-obscuring placement remains unproved.

## Remaining proposals

Blue as ordinary identity, amber as local concern and red as urgent; a companion
named-work list; peripheral work groupings; branching motion as a visual signature;
the specific expression vocabulary; and the three appearance directions.

`briar-presence` and private initial visibility are Briar's proposed setup, subject
to Alex's repository-creation approval. No licence, product name, production
architecture, hardware, VR runtime, notification policy or data contract has been
chosen. A signed publication approval is not acceptance of the visual design.
