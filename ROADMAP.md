<!-- prettier-ignore-start -->

--- FUTURE TASKS ---

1. Implement modifier support for other variables.
2. Transfer building construction state from hexes into separate objects.
3. Cancel 1  building level on construction instance if right click was detected on hex.
4. Instead of transferring hexes directly during war, mark them as occupied (de facto/de jure owner)
   and calculate surrender percentage based on that.
5. Make win/lose menu to and allow player to start new game or continue in spectator
6. Improve ai road pathfinding so it builds towards closest road segment that leads to producing building
7. Enforce AI staging, so it chooses a target hex and prepares for attack instead of attacking the first possible hex.
    The flow should be: analyze nation border, score attacks, attack immediately if enough army, else create staging request
    and pull army from other hexes to create enough army for attack.
8. Deprecate world analysis object. Instead, invoke every non-expensive selector manually, and only keep expensive calculations.
9. Design intent validation system after simulation finishes.
10. Add mobile support
11. Rethink training progression system. Training the same amount of manpower at different levels with the same supply
    should not be radically different in their speed (which is controlled by efficiency)
12. Setup redis to allow anonymous short-lived sessions
13. Add music and sound effects with an ability to disable in settings
14. Add water animation that scales with zoom.
15. Ensure map mode doesn't switch to "Military" when clicking on a hex.
    Player should still be
    able to open province info menu but stay in build mode

<!-- prettier-ignore-end -->
