# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Performance monitoring dashboard
- Error debugging with stack traces
- Multi-agent collaboration visualization
- LangChain auto-integration decorator
- Export data to JSON/CSV

## [0.1.0] - 2024-04-24

### Added
- Initial release
- Electron + React desktop application
- WebSocket server for real-time communication
- Thought flow visualization (graph + timeline views)
- Tool call tracing with detailed panels
- Token analysis with cost calculator
- Python SDK with LangChain integration
- TypeScript SDK
- Demo mode with simulated data
- Dark theme UI
- Search and filter functionality
- Slow call warnings (>1000ms)
- Model-specific pricing configuration

### Features

#### Thought Flow Visualization
- Tree-structured flow graph using ReactFlow
- Timeline view with chronological events
- Search thoughts by content
- Filter by type (reasoning/planning/reflection)
- Duration and token statistics
- Detailed thought panel

#### Tool Call Tracing
- Real-time status tracking (pending/success/error)
- Table and timeline views
- Parameter and result details
- Slow call detection and warnings
- Success rate statistics
- Average duration calculation

#### Token Analysis
- Input/output token statistics
- Trend charts (area chart)
- Model distribution (pie chart)
- Model comparison (bar chart)
- Cost calculator with custom pricing
- Support for GPT-4, Claude 3, and other models

#### SDKs
- Python SDK with context managers
- TypeScript SDK with async/await
- LangChain callback handler
- Decorator for tool tracing
- Auto-duration calculation

### Technical Details
- Built with Electron 28
- React 18 with TypeScript
- Ant Design 5 for UI components
- ReactFlow for graph visualization
- Recharts for data visualization
- Zustand for state management
- WebSocket for real-time communication

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 0.1.0 | 2024-04-24 | Initial release with core features |
| 0.0.1 | 2024-04-20 | Project initialization |