# T04 Player Cookie Visual Review — 2026-10-21

Reviewed the production Chromium captures at 1440×900. Each of the five existing cookie portraits is present exactly once, uses its original proportional PNG, stands on the route beside the slingshot, and exposes its selected identity to assistive technology. The same canonical player placement is created for all four regions and the camera unit tests include both cookie and weapon in enemy-response framing.

- Idle character captures: `tmp/wide-t04-player-{adventurer,alchemist,wizard,milk,wind}-forest-idle-1440.jpg`.
- Heal during the committed enemy response: `tmp/wide-t04-player-adventurer-forest-healing-1440.jpg`. The green healing signs appear at the cookie while the existing response still proceeds.
- Defense interception: `tmp/wide-t04-player-adventurer-forest-blocked-1440.jpg`. The bubble surrounds the cookie; HP remains unchanged and the actor uses the blocked pose.
- Normal incoming damage: `tmp/wide-t04-player-adventurer-forest-hit-1440.jpg`. The committed damage label and cookie recoil occur at the player anchor, with HP changing at the existing impact stage.

The response/visual path remains presentation-only: no player collider or new engine action was introduced. The captures and browser traces stay in untracked `tmp/`; region/layer visibility and input overlap were also exercised by the full production browser suite. This review does not claim a new damage rule or a user-run balance playtest.
