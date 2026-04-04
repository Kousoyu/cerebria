# Cerebria Changelog

## [1.1.0] - 2026-03-26

### Fixed
- **Critical**: Fixed UTF-16 LE encoding issues in README.md, package.json, and configuration files
- **Critical**: Added missing exports for ConfigManager and other core modules in src/index.js
- **Critical**: Updated package.json with complete metadata, scripts, and dependencies
- **Documentation**: Rewrote README.md with accurate project description and clear positioning
- **Documentation**: Fixed inconsistencies between documentation and actual API
- **Engineering**: Added .npmrc configuration for trusted publishing
- **Engineering**: Updated package.json version to reflect actual state

### Changed
- **Version**: Bumped from 1.0.0 to 1.1.0 to reflect foundational improvements
- **Description**: Updated project description from "Cognitive kernel system" to "A local-first, governed, recoverable agent runtime"
- **Exports**: Now properly exports all core infrastructure modules (ConfigManager, EventBus, FileLock, etc.)
- **CI/CD**: Package.json now includes proper test scripts for GitHub Actions workflow

### Notes
- This release focuses on fixing critical trust and engineering issues
- Many features listed in 1.0.0 are foundational frameworks that will be fully implemented in future releases
- The project is now in a state where contributors can reliably build and test

---

## [1.0.0] - 2026-03-26

### Added
- **Foundation**: Basic task management system framework (in-memory implementation)
- **Foundation**: Backup and recovery system framework (in-memory tracking)
- **Foundation**: Personality evolution framework with request/approval mechanism
- **Foundation**: Multi-level logging system framework (in-memory storage)
- **Foundation**: Health monitoring framework (basic metrics collection)
- **Foundation**: Event-driven architecture with EventBus
- **Foundation**: FileLock framework for concurrent safety concepts
- **Foundation**: Validator framework for parameter validation patterns
- **Foundation**: ErrorHandler framework for unified error handling patterns
- **Foundation**: ConfigManager for configuration management concepts
- **Foundation**: Three deployment mode concepts (light, standard, performance)
- **Foundation**: Basic test suite structure
- **Foundation**: Documentation structure

### Architecture Notes
- Version 1.0.0 establishes the architectural framework and module boundaries
- Many features are implemented as foundational frameworks awaiting persistence and production hardening
- The architecture is designed for evolution toward a production-ready agent runtime