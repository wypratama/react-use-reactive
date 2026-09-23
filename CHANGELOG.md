# Changelog


## v2.0.0

[compare changes](https://github.com/wypratama/react-use-reactive/compare/v2.0.0-beta.1...v2.0.0)

### 🤖 CI

- Harden validation workflow ([529d815](https://github.com/wypratama/react-use-reactive/commit/529d815))
- Harden release workflow ([7cfe672](https://github.com/wypratama/react-use-reactive/commit/7cfe672))
- Preserve release git credentials ([fe29c80](https://github.com/wypratama/react-use-reactive/commit/fe29c80))

### ❤️ Contributors

- Wicaksana Pratama <wicaksanapratama@gmail.com>

## v2.0.0-beta.1

[compare changes](https://github.com/wypratama/react-use-reactive/compare/v2.0.0-beta.0...v2.0.0-beta.1)

### 🩹 Fixes

- **release:** Add safe publish recovery for existing beta ([14672eb](https://github.com/wypratama/react-use-reactive/commit/14672eb))

### 🏡 Chore

- **package:** Normalize repository metadata ([06008bc](https://github.com/wypratama/react-use-reactive/commit/06008bc))

### ❤️ Contributors

- Wicaksana Pratama <wicaksanapratama@gmail.com>

## v2.0.0-beta.0

[compare changes](https://github.com/wypratama/react-use-reactive/compare/v1.0.1...v2.0.0-beta.0)

### 🚀 Enhancements

- **runtime:** Converge v2 semantics to a release candidate ([4bcbeeb](https://github.com/wypratama/react-use-reactive/commit/4bcbeeb))

### 🩹 Fixes

- **runtime:** Make identities follow data and harden held-reference liveness ([6ed8d62](https://github.com/wypratama/react-use-reactive/commit/6ed8d62))
- **runtime:** Reject defineProperty and make SSR/hydration tests rigorous ([ccb7eba](https://github.com/wypratama/react-use-reactive/commit/ccb7eba))
- **runtime:** Close v2 release blockers and freeze contract for 2.0.0-beta.1 ([8de1f1d](https://github.com/wypratama/react-use-reactive/commit/8de1f1d))

### 💅 Refactors

- **package:** Simplify to minimal ESM package ([51dcb57](https://github.com/wypratama/react-use-reactive/commit/51dcb57))
- **package:** Finish modernization of tooling and CI ([36854a1](https://github.com/wypratama/react-use-reactive/commit/36854a1))
- **package:** Finalize cleanup and verification checkpoint ([f345349](https://github.com/wypratama/react-use-reactive/commit/f345349))
- **runtime:** Rewrite useReactive on an immutable copy-on-write tree ([e1b174d](https://github.com/wypratama/react-use-reactive/commit/e1b174d))

### 📖 Documentation

- Clarify type limitation, descriptor normalization, beta numbering ([8e92264](https://github.com/wypratama/react-use-reactive/commit/8e92264))

### 🏡 Chore

- Use node 18 to run CI ([949920c](https://github.com/wypratama/react-use-reactive/commit/949920c))
- Lint test file ([b3cc120](https://github.com/wypratama/react-use-reactive/commit/b3cc120))
- **repo:** Untrack RELEASING.md from version control ([11de342](https://github.com/wypratama/react-use-reactive/commit/11de342))

### ✅ Tests

- Convert useReactive test from tsx to js ([9a8b30f](https://github.com/wypratama/react-use-reactive/commit/9a8b30f))

### 🤖 CI

- Add GitHub Actions release workflow ([8265017](https://github.com/wypratama/react-use-reactive/commit/8265017))
- **release:** Add GitHub Actions workflow with version selection ([df0920d](https://github.com/wypratama/react-use-reactive/commit/df0920d))
- **release:** Fix changelogen command for auto bump ([e0ddcc3](https://github.com/wypratama/react-use-reactive/commit/e0ddcc3))

### ❤️ Contributors

- Wicaksana Pratama <wicaksanapratama@gmail.com>

## v1.0.1

[compare changes](https://github.com/wypratama/react-use-reactive/compare/v1.0.0...v1.0.1)

### 🩹 Fixes

- Fix test failing due to structuredClone not defined ([5f1cf26](https://github.com/wypratama/react-use-reactive/commit/5f1cf26))

### 💅 Refactors

- Remove src from included files in package.json ([71aa6ea](https://github.com/wypratama/react-use-reactive/commit/71aa6ea))

### ❤️ Contributors

- Wicaksana Pratama <wicaksanapratama@gmail.com>

