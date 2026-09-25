# IMPLEMENTATION PLAN - omukun Shift

See execution details in memory/plan.

## Overview
omukun Shift is a high-performance, touch-first staff availability submission and manager shift-scheduling application built with Vanilla HTML, CSS, and JavaScript, powered by Vite.

## Architecture
- **Frontend**: Vanilla JS ES Modules, Design Tokens in CSS, Glass/Liquid UI design principles.
- **Storage**: `StorageAdapter` design pattern supporting local Demo Mode (`localStorage`) and Supabase integration.
- **Features**:
  - Staff Availability Submission Calendar with 7 explicit availability states.
  - Manager Workspace with Month View and Day Timeline (horizontal timetable with 15-minute drag/resize shift blocks).
  - Contextual Staff Selector showing live submitted availability.
  - Heuristic constraint-aware Auto Scheduler ("AIで仮シフトを作成").
  - Live monthly working hour & manager-only labor cost calculations.
  - High-resolution PNG schedule export with omukun branding.
