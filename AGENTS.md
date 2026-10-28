# Repository guidance

- This is a dependency-free static site. Open or serve `src/index.html`; there is no package manifest, build step, formatter, linter, or automated test suite in the repository.
- `src/index.html` loads non-module scripts in dependency order: `maze.js` → `game.js` → `render.js` → `main.js`. They communicate through `window` globals, so preserve that order and export any newly shared values explicitly.
- Keep gameplay state changes in `src/js/game.js`, Canvas drawing in `src/js/render.js`, and input/game loop/overlay behavior in `src/js/main.js`.
- `src/js/maze.js` is the immutable level template; `createGame()` clones it into `game.grid` so consumed dots do not mutate `MAZE`. Tile values are `0` empty, `1` wall, `2` dot, and `3` ghost-pen door.
- Maze rows must remain 28 cells wide and 31 rows tall: the canvas is fixed at 560×620 from `TILE = 20`. When changing maze geometry, keep `TUNNEL_ROW`, spawn coordinates, and the corresponding canvas dimensions consistent.
- For spec-driven work, use the repository-local `/spec` and `/spec-impl` skills in `.agents/skills/`. `/spec-impl` accepts only an approved spec and governs the implementation/branch workflow.
