# Round 01 — light clusters

Three alternative materials, shown in the same face and lighting conditions:

1. **Cloudlets:** soft luminous pockets. Can this feel expressive without becoming
   an indistinct haze?
2. **Constellations:** distinct groups of lights and deliberate dark gaps. Can this
   remain organic rather than looking like an instrument panel?
3. **Granular light:** a fine, dense particle field. Can this feel rich and deep
   without becoming noisy at laptop size?

Each direction shows **attention**, **focused work** and **holding a concern**.
There are no connecting lines. The local amber formation is an expression
proposal, not an alarm or a real task. Static artwork only; no live status.

## View

Open `overview.png` for comparison, or the individual `direction-a`, `direction-b`
and `direction-c` PNG/SVG files for closer inspection. `index.html` opens locally
without a server, network requests, scripts, fonts or media services.

## Reproduce

`generate.mjs` is a procedural **artwork-authoring tool**, not a candidate
production renderer. It uses a fixed seed. Node alone generates SVG:

```sh
node generate.mjs --svg-only
```

PNG rendering additionally needs the existing `sharp` package. Use a normal
local installation, or set `BRIAR_SHARP_MODULE` to an existing absolute module
directory. The tool does not install packages or fetch anything.

## Review

Which direction looks most like Briar? Where do the groupings feel too even,
too bright, too cloudy or too mechanical? Is concern a contained change rather
than an angry face? What should remain when this is much smaller? Recognition
of the intended states has not yet been tested.

Original procedural artwork. No third-party footage, stills or face textures.
