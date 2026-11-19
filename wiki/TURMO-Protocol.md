# TURMO / Turing-compatible USB display protocol notes

Recorded 19 November 2026. This is a reverse-engineered working reference, not a
manufacturer-issued specification or a claim that every listed command was tested.

## Sources and attribution

The protocol encoding and command meanings below are derived from Matthieu
Houdebine's **turing-smart-screen-python**, copyright 2021 Matthieu Houdebine and
contributors, licensed **GPL-3.0-or-later**. Briar Presence uses the same licence.

- [Pinned reference driver, `lcd_comm_rev_a.py`](https://github.com/mathoudebine/turing-smart-screen-python/blob/866e5ba999de0ed9373a46b6f2a714ef8322cfce/library/lcd/lcd_comm_rev_a.py).
- [Pinned image serialization helpers](https://github.com/mathoudebine/turing-smart-screen-python/blob/866e5ba999de0ed9373a46b6f2a714ef8322cfce/library/lcd/serialize.py).
- [Hardware identification guide](https://github.com/mathoudebine/turing-smart-screen-python/wiki/Hardware-revisions).
- [Upstream example and brightness caution](https://github.com/mathoudebine/turing-smart-screen-python/blob/866e5ba999de0ed9373a46b6f2a714ef8322cfce/simple-program.py).

The pinned revision is the local upstream checkout used for this work. The
hardware-identification website was also checked on 19 November 2026.
These notes and the local sender adapt that project's work; they are not an
independently discovered protocol. Assisted-by: Briar.

## Identification: protocol family is not PCB revision

The connected unit reports USB VID:PID `1a86:5722` and serial identifier
`USB35INCHIPSV2`. The recorded handshake reply is `01 01 01 01 01 01`.
The upstream driver calls that reply `USBMONITOR_3_5` and maps it to 320 × 480.
Its `LcdCommRevA` class supports both original Turing 3.5-inch and UsbMonitor
variants. The hardware guide lists `USB35INCHIPSV2` under Turing Smart Screen
3.5-inch and warns that resellers sometimes incorrectly label that model
“revision A”. Neither a class name nor this reply proves the PCB revision.

Call this a **Turing/UsbMonitor-compatible 3.5-inch unit using the Rev-A driver
protocol**. Its exact PCB revision and model-specific thermal rating are not
verified. The TURMO branding alone does not establish either.

## Transport and framing

The tested host setup uses USB serial, 115200 baud, RTS/CTS, and one exclusive
serial-port owner. The baud setting is not a measured USB throughput limit.
Do not open another writer while the face or dashboard owns the port.

Normal commands have this six-byte packed header. `x`, `y`, `ex`, `ey` are the
fields appropriate to that command; bitmap right/bottom coordinates are inclusive.

```text
byte 0 = x >> 2
byte 1 = ((x & 3) << 6) | (y >> 4)
byte 2 = ((y & 15) << 4) | (ex >> 6)
byte 3 = ((ex & 63) << 2) | (ey >> 8)
byte 4 = ey & 255
byte 5 = command
```

### Commands in the reference driver

| Decimal | Meaning | Evidence / limits |
| --- | --- | --- |
| 69 | HELLO / model probe | Special request: six bytes of `0x45`, followed by a six-byte response. Verified on this unit. |
| 101 | Reset | Upstream implementation; not used in the Briar handover. Can re-enumerate the serial port. |
| 102 | Clear to white | Upstream notes an orientation-related clear workaround. Not used by the face sender. |
| 103 | Black screen | Marked untested upstream. |
| 108 / 109 | Screen off / on | Write commands; on is used by our sender. |
| 110 | Set brightness | Write-only in the known driver; encoding below. |
| 121 | Set orientation | Special 16-byte packet; tested orientation below. |
| 197 | Display bitmap rectangle | Header, then the exact rectangle's RGB565 little-endian pixels. Full and partial rectangles used locally. |
| 122 | Mirror | Upstream marks this as next-generation-specific; not verified here. |
| 195 | Display non-contiguous pixels | Upstream marks this as next-generation-specific; not verified here. Do not assume this unit supports it. |
| 40 / 41 | Unknown-purpose commands | Listed upstream, not a specification of safe behaviour. Not probed. |

No known command in this reference provides a framebuffer/page flip or vsync
barrier. That is an evidence gap, not proof that no firmware variant supports one.

### Brightness

The upstream conversion for a requested percentage `p` is:

```text
wire_value = int(255 - (p / 100) * 255)
send command 110 with x=wire_value and other fields zero
```

Thus 100% uses wire value 0, not 255. The 100% packet is
`00 00 00 00 00 6e`. Upstream maps nominal 50% to 127; the earlier local sender
used 128, approximately 50%. Sending a requested level is not reading back actual
brightness or luminance.

The upstream example cautions that revision-A displays can get hot and recommends
at most 50%. This is not a verified manufacturer thermal limit for this exact
unit, nor does uncertain PCB identification establish that 100% is safe. Alex
explicitly requested 100% after the caveat was explained. Our sender has no
temperature-based cutoff because no display-temperature readback is known.
This records the current request, not authority for future brightness changes.

### Orientation

The driver sends a 16-byte zero-initialised packet with:

```text
byte 5 = 121
byte 6 = orientation_enum + 100
bytes 7..8 = width, big-endian
bytes 9..10 = height, big-endian
```

Our tested cable-at-top configuration is reverse portrait: byte 6 is 101,
width 320 (`01 40`), height 480 (`01 e0`). This wire value is not a hardware
revision identifier. The bitmap dimensions must match the orientation.

### Pixel updates

For an inclusive rectangle `(x,y)..(ex,ey)`, command 197 is followed by
`(ex-x+1) × (ey-y+1) × 2` bytes, in row order. Each pixel is:

```text
packed = ((red >> 3) << 11) | ((green >> 2) << 5) | (blue >> 3)
transmit packed as a little-endian 16-bit value
```

A full frame is 307200 pixel bytes plus the six-byte header. The sender uses
2560-byte-or-smaller write chunks, following the tested upstream approach.
Chunks are transport writes, not atomic visible frames. Our current animation
holds its base image stable inside each cue and updates sparse highlights;
8px tiles coalesce only within a light cluster, and clusters are sent centre-first.
Identical frames generate no pixel transfer. Cue changes may still show a redraw.

## What can actually be read back?

The only response-reading path in this reference driver is HELLO:

| Six-byte response | Upstream interpretation | Dimensions inferred by the host |
| --- | --- | --- |
| `01 01 01 01 01 01` | USBMONITOR_3_5 | 320 × 480 |
| `02 02 02 02 02 02` | USBMONITOR_5 | 480 × 800 |
| `03 03 03 03 03 03` | USBMONITOR_7 | 600 × 1024 |

The 3.5-inch response was verified locally; other rows are upstream definitions,
not tests on other hardware. The driver falls back to its original Turing 3.5-inch
classification for an unrecognised/missing response; that fallback is not proof
of identity. Resolution is inferred from the reply, not returned as a separate field.

There are **no documented read commands in this reference** for panel/controller
temperature, firmware version, exact PCB revision, current brightness, orientation,
power draw, framebuffer contents, thermal alarms or per-frame completion status.
Do not claim these are impossible across every firmware; they are unverified here.

USB VID/PID, product/serial descriptors and the device path are host USB-enumeration
information, not extra serial-protocol telemetry. `serial.flush()` completion
means the host write drained; it is not an acknowledgement that the LCD finished
drawing. Displayed CPU/GPU temperatures come from external monitoring sources and
must never be labelled as the screen's own temperature. An external temperature
measurement would be needed to assess the panel's heating with the known protocol.

## Current local implementation

See [portrait prototype and live handover notes](../prototypes/portrait-presence-01/README.md).
The current source supports an explicit `--brightness 0..100` setting, with 50%
as the default; it does not install an autostart service or alter firmware. Protocol
tests cover brightness byte values, RGB565 encoding and exact partial-frame
reconstruction. This document and the local code have not been published by this
documentation update; publication still follows the repository's normal review.
