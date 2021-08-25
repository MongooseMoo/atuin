- Improve world serialization with a better library and not hand-written functions
- world snapshots saved in git using isomorphic-git, triggered for program add/edit/delete, object add/delete, permission add/edit/delete, and possibly coalesced property changes (every 10 minutes for prop changes?
- Tests, especially ones that try to break out of the sandbox
- Improve permissions, probably just gonna need to pass oids around for the contexts.
- Figure out object registry/name lookup, $obj?
  Object inheritance? Or should everything be based around an Entity-component system in-world?
