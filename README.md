# Algebro

An educational mobile app for practicing algebra problems.

## Current State

Algebro is currently in early development. The app presents a single "dummy" algebra problem with:

- A clean problem display
- An input field for answers
- A submit button
- Dark-themed UI optimized for mobile

The foundation is built using React Native with Expo, supporting both iOS and Android platforms.

## Technical Architecture

- **Framework**: React Native with Expo
- **Navigation**: Expo Router (file-based routing)
- **Language**: TypeScript
- **Build System**: EAS Build with multiple app variants (development, preview, production)

## Project Structure

- `app/` - Screens and navigation
- `components/` - Reusable UI components (Button, ProblemContainer)
- `assets/` - Images and static resources

## Planned Features

- Step-by-step solutions
- Dynamic problem generation
- Answer validation with feedback
- Multiple algebra topics
- Progress tracking
- Difficulty levels
