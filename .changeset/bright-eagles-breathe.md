---
"@aliou/pi-toolchain": minor
---

Add a new `preventDockerSecrets` blocker feature to reduce accidental secret exfiltration from Docker containers.

When enabled, toolchain blocks:
- `docker inspect` (can expose `Config.Env`)
- `docker exec ... env`
- `docker exec ... printenv`
- `docker exec ... cat /proc/<pid>/environ`

The feature is opt-in and defaults to `false`.
