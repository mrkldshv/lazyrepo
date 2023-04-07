# urgent

- handle failure gracefully
- add pnpm support
- Add concurrency
- cache outputs
- feed outputs into inputs, and inputs into inputs

# features

- support json schema and .ts config files
- init script
- Add turbo.json migrator
- Add 'watch' mode with inactivity timeout to wait for things to bootstrap.
- Allow packages to override their own task definitions

# questions

- should peer deps, dev deps, and optional deps count towards the dep graph?
- Look at turbo's api, cli options, behavior & make explicit decisions about what to
  keep/drop/modify.