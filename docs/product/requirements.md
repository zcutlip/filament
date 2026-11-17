# Product Requirements

This document describes the product to build around the game defined in `docs/spec/`. The spec defines the rules of the game. This document defines everything else: architecture, appearance, sharing, agent play, hosting and packaging.

## 0. Precedence and conventions

- **Rules come from `docs/spec/`.** This document may change any aspect of presentation and may add features. It changes a gameplay rule only through a numbered item in §8 (Gameplay-affecting decisions). Anything not covered by §8 keeps the behavior in `docs/spec/`.
- **Keywords.** MUST, SHOULD and MAY are used as in RFC 2119.
- **IDs.** Requirements have stable IDs (`ARCH-3`, `LNK-A1`, …) for reference in commits, tests and reviews.
- **Technology.** Language, framework, rendering, storage and build tooling are the implementer's choice unless a requirement constrains them. Where one does (e.g. ARCH-2), it states the constraint and leaves the choice open.
- **Phasing.** §9 gives the delivery order. The architecture in §2 MUST be in place from the first milestone, because later features depend on it.

## 1. Principles

1. **Server-optional.** The game MUST be fully playable as a static client with no server. Server-backed features are additive: a client configured with a server URL gains them, and a client without one loses nothing else.
2. **One simulation core, many clients.** The browser UI, the agent API, observers and tests all drive the same core through the same commands.
3. **Local first.** Every feature that can work without a hosted server SHOULD have a mode that does, including agent play.
4. **Phased delivery.** Ship the simplest useful subset of each feature first (§9).

## 2. Architecture constraints

- **ARCH-1 Headless core.** The simulation is a self-contained module: state, commands and a step function. It MUST NOT access UI, network, storage, wall-clock time or a global random source. Randomness and any host services are injected.
- **ARCH-2 One core implementation.** The same core implementation MUST run in the browser and in a headless host process (agent host, server, test runner). Don't maintain two ports of the rules. This constrains the language choice to something that runs in both environments, directly or by compilation. The browser build MUST also load quickly on a mid-range phone (APP-3, APP-6), which rules out shipping a full general-purpose language runtime to the browser (for example, CPython compiled to WebAssembly). Languages that run natively in browsers, or that compile to a lean WebAssembly module, meet this. Clients that attach over the session protocol (ARCH-8) are not bound by ARCH-2 and may be written in any language.
- **ARCH-3 Determinism.** Given the same initial state, RNG seed and ordered list of `(tick, command)` pairs, the core MUST produce identical state on the same runtime. The RNG MUST be a seedable PRNG whose state is part of the save. The loop order in spec 01 §3 ("recommended deterministic order") becomes mandatory. Cross-runtime bit-identical results are a SHOULD only: transcendental math functions (`sin`, `pow`, `log10`) can differ across JavaScript engines and platforms. Cross-device features therefore sync by snapshot (§4), and replay is used for tests and reproducible agent runs on one host.
- **ARCH-4 Commands.** Every player action is a typed command: make clip, buy wire, raise price, select strategy, set slider position, buy project N, and so on. The catalog is derived from every button, slider and selector in spec 02. Each command is validated when it executes (spec 00 §4 item 3) and returns `accepted` or `rejected` with a reason. UI input, API calls and replays all go through this one path.
- **ARCH-5 View model.** A pure function of state produces the **view model**: what a player can see and do. It covers visible panels; every displayed field as both a raw value and its spec-formatted string; enabled and disabled controls; the project list with current titles, price tags and affordability; console lines; and active effects (blink, HypnoDrone event). The UI renders the view model, and the agent API returns it. Both therefore see the same game.
  - **Renderer-neutral.** The view model MUST NOT assume a browser: no markup, styling, pixel coordinates or layout. Everything a graphical client draws MUST also exist as data that a text-only client can render. That includes the combat view (ship positions and states on the battle grid, explosions, the result), quantum chip brightness, the HypnoDrone effect, and progress and fill indicators. Presentation logic belongs in each client, never in the core.
  - **Input-neutral.** Every command MUST be reachable without a pointer: keyboard-only or a command line. Sliders, selectors and the probe design arrows need discrete inputs (e.g. set slider position to N, step it up or down).
- **ARCH-6 Clock.** The core advances only through `step(n)`. The host chooses pacing: real time (100 steps/s), paused, agent-stepped (§5) or accelerated (debug only). Animated mechanics run on game time (spec 00 §4 item 8). Rendering is decoupled from stepping.
- **ARCH-7 Save format.** Use the versioned serializer from spec 08 §10, extended with metadata: format version, session ID, RNG state, provenance (§8 G7), enabled variants (spec 00 §4 item 0), and created and updated timestamps. Unknown future versions MUST be rejected with a clear message rather than loaded partially.
- **ARCH-8 Session host.** One **host** owns the authoritative running simulation: a browser tab, the local agent host or the server. **Clients** attach to it: the interactive UI, observers and agents. They speak a transport-neutral message protocol with these messages: view update (full or delta), command, command result, events (console messages, phase changes), and session metadata. The protocol is defined once and carried over in-process calls, WebSocket/HTTP and MCP.

## 3. Appearance

- **APP-1 Modern UI.** Visual design and layout are free to change. Every piece of information and every control in spec 02 MUST stay reachable. The progressive reveal (spec 02 §7 progression map) MUST be preserved: panels and controls appear when the spec says they do, never earlier. Console messages and their text are preserved.
- **APP-2 Theming architecture.** All visual styling MUST come from semantic design tokens: color roles, typography scale, spacing, radius, elevation and motion. Components MUST NOT hard-code colors or fonts. Ship one theme first. Light and dark variants SHOULD follow. A "Classic" theme reproducing spec 02 §3 MAY be added later. Adding a theme MUST NOT require changes to components.
- **APP-3 Mobile and desktop as equal peers.** The layout MUST work well from about 360 px wide phones through large desktops, in both orientations. It is designed for each class of screen, so phones get more than a shrunken desktop layout. Touch targets are at least 44×44 pt. The game MUST be completable on a phone.
- **APP-4 No hover-only interactions.** Every hover interaction in the original needs an equivalent that works by tap and by keyboard:
  - clip-count tooltip (spec 02 §6.0)
  - "Disassemble All" refund tooltips (spec 04)
  - probe design tooltips (spec 02 §6.10(h))
  - tournament grid rollover (spec 02 §6.10(d), spec 03). This one has a gameplay effect; see §8 G1.
- **APP-5 Accessibility.** Everything SHOULD be operable by keyboard, with accessible names on all controls and live-region announcements for console messages. The HypnoDrone event (spec 02 §4.3) is a full-screen strobe. When the OS reduced-motion preference is set, it MUST be replaced by a non-flashing effect of the same duration, and it SHOULD comply with WCAG 2.3.1 (three flashes or fewer per second) in all cases. See §8 G5.
- **APP-6 Performance.** Simulation runs at 100 steps/s regardless of render rate. The UI SHOULD hold a smooth frame rate on a mid-range phone in the late game.

## 4. Shareable links

There are two capabilities: **resume** (continue my game on another browser or device) and **observe** (read-only viewing). They are delivered in two phases.

### Phase A: no server

- **LNK-A1 Transfer link (resume).** Encodes the complete save (ARCH-7), compressed and URL-safe encoded, in the URL fragment. The fragment is never sent to a server, so a static host works. Opening the link offers to load the game, with a confirmation if a game already exists on that device. Semantics: copy. Afterwards the two devices hold independent games. The client SHOULD also offer the link as a QR code for desktop-to-phone handoff. The implementer MUST measure the encoded size across a full playthrough and report it. If links get long enough to break in common messaging apps, provide a fallback: copy the save as text, or download it as a file.
- **LNK-A2 Snapshot link (observe).** Same encoding, but it opens a read-only view of the game at that moment: no commands, no autosave, and it never touches the viewer's own game. It does not update live.

### Phase B: with a server

- **LNK-B1 Live observation link.** Observers see the session update live, with roughly 1 s latency at most. View updates are throttled, e.g. to 4–10 per second. The link carries a read-only capability token that the owner can revoke and regenerate. Observers MUST NOT be able to issue commands.
- **LNK-B2 Server-backed resume.** A short link with a separate secret resume token. Resuming is single-writer: opening the link on device B takes the write lease, and device A switches to observer mode with a notice that the game continued elsewhere. Device A can take the lease back the same way. Resume and observe tokens are distinct, revocable and regenerable.
- **LNK-B3 Authority.** For human games, the player's client is the host. It pushes state (snapshots, or deltas plus periodic snapshots) to the server, which stores and relays it. For hosted agent games, the server is the host. Both use the same protocol (ARCH-8). The server doesn't validate client-pushed state; there are no competitive stakes. If leaderboards are ever added, they need server-authoritative play.
- **LNK-B4 No accounts.** Tokens are capabilities: whoever holds one can use it. Retention is based on inactivity only. A session is active while its host is pushing state or a client issues commands. Active sessions are kept indefinitely. A session with no activity for the retention period (default 90 days, configurable) is deleted.

## 5. Agent API

- **API-1 Protocol and adapters.** The agent API is the session protocol (ARCH-8) plus agent-specific operations, defined once. It MUST have an MCP adapter supporting the stdio and streamable HTTP transports. It SHOULD have a plain HTTP/JSON adapter.
- **API-2 Operations** (names illustrative):
  - `new_game(seed?, variants?, debug?)` creates a session.
  - `get_view()` returns the view model (ARCH-5).
  - `list_actions()` returns the currently enabled commands, each with an argument schema and its cost where the spec defines one.
  - `act(command)` returns the command result and a compact summary of what changed.
  - `wait_for(condition, timeout_seconds)` (real-time mode) blocks until the condition holds or the timeout passes, then returns the current view. Conditions include: a new console message, a new project available, a command becoming enabled, a resource reaching a threshold, a phase change.
  - `advance(ticks)` and `advance_until(condition, max_ticks)` (stepped mode only) take the same conditions. A full game is many hours of game time (hundreds of thousands of ticks per hour), so stepped agents need to skip ahead efficiently.
  - `get_events(since_cursor)` returns console messages and phase changes (see §8 G8).
  - `export_save()`, `import_save()`, and `observe_link()` (LNK-A2/B1).
- **API-3 Pacing.** Two modes, chosen at `new_game` and recorded in provenance:
  - **Real-time (default).** The simulation runs at 100 steps/s on the host whether or not the agent is acting, the same way it runs for a human. The agent checks in, acts and waits, and the game keeps unfolding while it thinks. Every view carries its tick number. Because a view may be seconds old by the time the agent acts, commands can be rejected for changed state; the agent sees the reason and re-reads. If the agent disconnects, the game keeps running while the host lives, the same as a human leaving the tab open. The host autosaves on shutdown.
  - **Stepped (opt-in).** The simulation advances only through `advance`/`advance_until`, so agent thinking time costs no game time. Intended for fast, reproducible runs from a seed (benchmarks, regression tests, comparing agents).
- **API-4 Observation parity.** By default an agent receives only the view model, i.e. what a player could see. Raw numbers for displayed values are fine; for example, chip brightness is shown numerically. Full internal state is available only in debug sessions.
- **API-5 Input parity.** See §8 G2.
- **API-6 Watching agents.** An agent session is an ordinary session, so a human watches it through observation (LNK-A2, LNK-B1, or local per API-7). The observer UI SHOULD show a timeline of the agent's commands next to the game. A human MAY take over an agent session in a later version; takeover marks provenance as mixed (G7). The session protocol and provenance model MUST allow for takeover from the start, even if the feature ships later.
- **API-7 Local agent host.** The MCP server MUST be able to run fully locally with the core embedded, without a hosted server. It SHOULD serve the observer UI on localhost so the user can watch the agent's game in a browser.
- **API-8 Debug isolation.** Debug and cheat commands (spec 08) are available only in sessions created with `debug: true`, which provenance records. They never appear in `list_actions` otherwise.
- **API-9 Agent guide.** Provide a short player-facing guide to the game's controls and concepts, readable through the API (e.g. as an MCP resource). Whether agents may also read `docs/spec/` is an open decision (§10).

## 6. Server and storage

- **SRV-1 Scope.** A server is needed only for Phase B links (§4) and hosted agent sessions (§5). The static client and the local agent host work without one.
- **SRV-2 Single service.** One service provides static client hosting, the session relay and storage, the HTTP/WebSocket API and MCP over HTTP. A single instance is sufficient; horizontal scaling is not required.
- **SRV-3 Embedded storage.** Use an embedded single-file database or plain files by default, so the service needs no external database. Stored data: session metadata, the latest snapshot, token hashes (never plaintext tokens), and optionally command logs.
- **SRV-4 Limits.** All of these are configurable: maximum sessions, maximum snapshot size, rate limits per token and per IP, observer count per session, and retention period.
- **SRV-5 Privacy.** The server stores only game state and session metadata. No accounts and no third-party analytics.

## 7. Containerization

- **CTR-1 OCI images.** Distribute as OCI-compliant images that run unmodified under Docker, Podman, Apple's `container` tool, containerd/nerdctl and Kubernetes.
- **CTR-2 One image, no orchestration required.** One image runs the whole service (SRV-2). A Compose file MAY be provided as a convenience but MUST NOT be required, because not every runtime supports Compose.
- **CTR-3 Multi-arch.** Publish `linux/amd64` and `linux/arm64`.
- **CTR-4 Runtime contract.**
  - Configuration only through environment variables.
  - All persistent data under one mount path (e.g. `/data`).
  - One listening port, configurable.
  - Runs as non-root and works with a read-only root filesystem.
  - Has a health endpoint.
  - On SIGTERM, flushes and shuts down gracefully.
  - Uses no runtime-specific features: no container-engine socket, no privileged mode, no host networking.
- **CTR-5 Portable build.** The image build uses a standard Containerfile that common builders (docker buildx, podman, buildah) can build. Avoid builder-specific extensions where possible.
- **CTR-6 Containers are optional.** The service also runs as a plain process, and the client deploys to any static host.

## 8. Gameplay-affecting decisions

These are the only places this document changes or constrains gameplay rules. Each one is recorded in the save's provenance or variants where relevant.

- **G1 Tournament grid without hover.** In the original, hovering the tournament area shows the payoff grid and pauses auto-tourney (spec 02 §6.10(d), spec 03). Replace hover with an explicit "show grid" toggle. While the grid is shown, auto-tourney is paused and its 3-second wait is reset, the same as hovering. Desktop MAY also keep hover.
- **G2 Agent input rate.** Through the API, an agent could issue far more commands than a human could click: thousands of manual clip clicks per tick in stepped mode, perfectly timed quantum Compute clicks, price changes every tick. In agent sessions (both modes), manual repeatable commands are limited to a configurable number per game second. In real-time mode a game second is a wall-clock second. These are make clip, Compute, raise/lower price, and the other click-spam actions; the implementer lists them from spec 02. Default: 10 per game second, about the sustained rate of a fast human, configurable per session. If agents' quantum Compute timing proves too strong, add a separate lower limit for Compute. Purchases and settings are not limited. The limit is recorded in provenance.
- **G3 Exact information for agents.** Exposing numeric chip values and other display values makes timing-based skill (quantum Compute) easier for agents than for humans. Accepted as-is; G2 limits how far it can be exploited.
- **G4 Stepped time.** Stepped agent sessions (API-3) don't run in real time. Game rules are unchanged; only wall-clock pacing differs. Provenance records the mode, because stepped runs remove the time pressure that real-time players face.
- **G5 Reduced-motion HypnoDrone event.** Presentation only; timing and state effects are unchanged (APP-5).
- **G6 Links act as save slots.** Transfer links (LNK-A1) let a player save, prestige and then reload, which is the prestige farming described in spec 08-P16. Because links make slots player-facing, the 08-P16 variant MUST be enabled in any build that ships LNK-A1 or LNK-B2 (spec 00 §4 item 10).
- **G7 Provenance.** Every save records: `human`, `agent` or `mixed` play; the agent pacing mode (real-time or stepped); whether debug was ever enabled; enabled variants; and the agent input limit. Observers see provenance in the UI.
- **G8 Message history for agents.** The original console shows only the last 5 messages, so a human who looks away can miss some. `get_events` gives an agent the full history since its last check. Accepted: messages are mostly narrative and hints, and an agent checking in periodically needs them. An agent in real-time mode can't see transient visual effects (blink, the HypnoDrone event) unless it checks in at that moment; the view model reports effects that are active.

## 9. Milestones

Each milestone ends with its acceptance criteria met and its tests passing.

1. **Core.** Headless core per ARCH-1–7, with spec conformance tests: formatter examples (spec 01 §1), seeded per-system tests (spec 00 §6), save round trips, and determinism (the same seed and command log give the same state). A command-line harness can play scripted games. No UI yet.
2. **Client.** Modern UI over the view model (APP-1–6), local autosave, themes via tokens, responsive layout and accessibility. The game can be played start to finish on desktop and on a phone.
3. **Links, Phase A.** Transfer and snapshot links (LNK-A1/A2), with the G6 variant on. Report the measured link sizes.
4. **Local agent play.** MCP adapter (stdio) with the core embedded (API-1–9), real-time and stepped modes, G2 limits, and a localhost observer UI with a command timeline. Acceptance: an agent plays a real-time game by checking in periodically while the user watches it unfold live in a browser; the same agent can run a stepped game from a seed and reproduce it.
5. **Server and container.** Single service (SRV-1–5), Phase B links (LNK-B1–B4), hosted agent sessions, MCP over HTTP, and the OCI image (CTR-1–6), verified on at least Docker, Podman and Apple's `container` tool on both architectures.

**Planned future clients** (not scheduled; design for them now):

- **Terminal UI.** A full-featured terminal client. It either embeds the core for solo play with no server, or attaches to a running session over the protocol (ARCH-8) to play or observe, including watching an agent's game. It relies on ARCH-5 staying renderer-neutral and input-neutral. If it attaches over the protocol, it may be written in any language (ARCH-2).

## 10. Resolved decisions

1. **Agents and `docs/spec/`.** By default agents get only the player guide (API-9). A configurable "informed agent" mode MAY allow reading `docs/spec/`, and provenance records it.
2. **Agent input limit (G2).** Default 10 manual actions per game second, configurable per session.
3. **Human takeover of agent sessions (API-6).** Wanted. It may ship after milestone 4, but the protocol and provenance support it from the start.
4. **Agent pacing (API-3).** Real-time is the default and matches how people play an idle game: check in, act, wait. Stepped is opt-in for fast, reproducible runs. Both ship in milestone 4.
5. **Server session retention (LNK-B4).** Inactivity-based, 90 days by default. Active sessions are kept indefinitely.
