# LVGL / ESP32 MQTT-subscriber display — implementation target

Alex requested an LVGL implementation suitable for an ESP32-class display
subscribing to MQTT. This names a distinct target to review and implement;
there is no device firmware, selected board or demonstrated hardware support
yet. It is not authority to connect, flash or provision a device.

Dedicated work item: [LVGL/ESP32 display #12](https://github.com/DynamicDevices/briar-presence/issues/12),
under API parent #3 and depending on [MQTT transport #11](https://github.com/DynamicDevices/briar-presence/issues/11).

## Proposed responsibilities

The accepted-state service handles source admission, complete input validation,
ordering, user/workspace scope and concern/focus/acknowledgement semantics.
The device subscribes to an authorised **accepted-view** stream, validates its
version/bounds and renders the agreed meaning locally with LVGL. It must not
become a competing reducer or infer health from arbitrary producer topics.

Keep the portable visual model/presentation separate from LVGL, the board
support package and display/touch drivers. Preserve the accepted clustered-light
face and quiet wandering behaviour. Proposed device optimisations may use fewer
lights or simpler glows, but require an explicit quality profile and visual
comparison rather than claiming fidelity from frame rate alone.

Send compact semantic/presentation changes over MQTT, not a continuous stream
of per-pixel frames or all 1,170 light positions. Animate locally from an explicit
seed and timing policy; protocol/state changes and rendering cadence are separate.
Define the representation and conformance vectors before porting it to C/C++.

## Candidate stack to evaluate

- [LVGL](https://github.com/lvgl/lvgl) for rendering; upstream metadata identifies
  MIT licensing. Review the exact chosen release and component licences before
  distributing firmware; no version is pinned or installed by this proposal.
- Espressif's [ESP LVGL port](https://components.espressif.com/components/espressif/esp_lvgl_port)
  for a supported ESP-IDF/LVGL/display integration. Select compatible exact
  versions and the actual board/panel/touch controller; do not assume any ESP32
  display is interchangeable or that every target has PSRAM.
- [ESP-MQTT](https://docs.espressif.com/projects/esp-mqtt/en/stable/esp32/)
  as the first client to assess against the reviewed MQTT profile. Verify actual
  MQTT version, TLS and memory configuration on the selected SDK/board.

Source metadata and accessible documentation are discovery evidence, not a
successful firmware build, licence audit, benchmark or interoperability result.
Existing Godot/Canvas tests do not establish LVGL/ESP32 behaviour.

## Capacity and rendering questions

Measure heap/stack, frame buffers, TLS/MQTT buffers, parsed message storage and
rendering workload together. Examples at RGB565, excluding all other overhead:

| Example buffer | Bytes | Approximate KiB |
| --- | ---: | ---: |
| 320 × 240 full frame | 153,600 | 150 |
| 320 × 32 partial strip | 20,480 | 20 |
| Two such partial strips | 40,960 | 40 |
| 480 × 480 full frame | 460,800 | 450 |

These are arithmetic examples, not the chosen display, memory budget or proof
of fit. Compare partial versus full buffering, flush bandwidth, DMA-compatible
allocation, PSRAM/internal-RAM requirements and tearing on the actual driver.
Do not assume external RAM is valid for every DMA path.

Prefer bounded reusable draw objects/buffers and measured redraw regions.
Evaluate LVGL drawing primitives/layers and blend/glow costs before choosing
per-light objects. Avoid per-frame allocation and packet bursts disrupting
animation. Cap brightness and honour reduced motion independently of MQTT
arrival rate. Report measured smoothness and face recognisability separately.

## Connection, privacy and interaction

Apply the [MQTT transport review](MQTT-TRANSPORT.md): TLS/server identity,
device-specific least-privilege credentials, user/workspace subscriptions,
duplicate/revision handling and bounded messages/queues. Never embed private
credentials in examples or source. Exact provisioning/credential custody needs
its own reviewed execution scope; device possession is not authority.

A retained old view or loss of broker/accepted-state-owner contact must become
unknown, not a reassuring animation. Preserve original observation age/lease
limits; reconnection/receipt time cannot freshen stale facts. Define clock skew,
trusted view age and local timeout behaviour explicitly. If freshness cannot be
established, remain unknown until a valid current view arrives.

Default first-device proposal: **display-only subscriber**. Touch/buttons and
publishing focus/acknowledgement can be a later reviewed extension, with bound
user scope and current revision checks. Acknowledgement must not imply concern
resolution, approval authority or physical device authentication.

## Acceptance and dependencies

1. Select board/chip, panel/resolution/interface, RAM/PSRAM, power and optional
   touch input; establish a compatible pinned LVGL/ESP-IDF/port/client stack.
2. Agree compact versioned accepted-view/presentation and display capability
   profiles under the MQTT issue, independent of the desktop/Godot host.
3. Implement a portable LVGL renderer with deterministic synthetic vectors;
   compare quiet work, provisional/confirmed concern, acknowledgement, explicit
   resolution and unknown states with the accepted face. Document quality limits.
4. Under separately authorised build/device scope, prove actual firmware,
   memory headroom, display fidelity/smoothness, brightness/reduced motion,
   disconnect/reconnect and stale/retained-view handling on the named board.
5. Verify a real authorised broker and independent producer/subscriber clients,
   including multiple displays, user isolation and revocation. Record actual
   versions and evidence; a simulator is not device acceptance.

MQTT transport/view-envelope agreement is a dependency. Renderer/vector design
can proceed against synthetic fixtures before hardware or broker access. This
does not make broker/device execution covered by the current synthetic grant.

Assisted-by: Briar
