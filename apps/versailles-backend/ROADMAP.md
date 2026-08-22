<!-- prettier-ignore-start -->

** PRODUCTION MUST RESOLVE PACKAGE.JSON IN
SHARED PACKAGE TO DIST **

list of changes to make next: 
5. Fix drag bar by rounding fractions
6. Add level label for building icons in roman numerals in economy map mode
7. Update road rendering to draw roads like straight white lines / dashed lines 
8. Hide province info side bar if no hex selected 
9. Create 2 map modes: diplomatic and building 
10. setup a database ( or redis ) 
12. bug fixes + ui polishment, clean up architecture 
13. Music, sound effects, reusable components 
14. deploy

--- NON-URGENT TASKS ---

1. Make sure nation flags and assets are pre-loaded so player doesn't wait
   for them to load (which can take up to a second)
2. Implement modifier support for other variables
3. Transfer building construction state from hexes into separate objects
4. Create a single function for creating and validating instead of having multiple
   sources where its required to validate every time.
5. Reduce amount of building levels on building if right click has happened on hex
6. Instead of transferring hexes directly during war, mark them as occupied (de facto/de jure owner)
   and calculate surrender percentage based off of that.
7. Make win/lose menu to and allow player to start new game or continue in spectator
8. Change how paths work to make sure moving goals armies in hex are always reserved no matter the order they run
9. Skip invalid intents that don't pass domain validation. Aim for architecture to be
   client data => copy db data => run logic and update data => if error - log and skip, else update db
10. Update ai road building so it builds towards closest road segment that leads to producing building
11. Enforce AI staging, so it chooses a target hex and prepares for attack instead of attacking the first possible hex.
    The flow should be: analyze nation border, score attacks, attack immediately if enough army, else create staging request
    and pull army from other hexes to create enough army for attack.
12. Make each building have its own production rates instead of relying on fixed rates for each resource
13. Deprecate world analysis object. Instead invoke every non-expensive selector manually, and keep only expensive
    calculcations.
14. Think how AI intents validate after simulation runs.
15. Add mobile support
16. Rethink training progression system. Training the same amount of manpower at different levels with the same supply
    should not be radically different in their speed (which is controlled by efficiency)

<!-- prettier-ignore-end -->
