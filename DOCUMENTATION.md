# AI Product Studio Documentation

## Project Overview

AI Product Studio is a web application designed to help users generate professional product lifestyle images and ad creatives using generative AI. Users can upload product photos, and the application provides a suite of tools to create, edit, upscale, and organize visual assets for e-commerce and marketing campaigns.

## Core Technologies

- **Framework**: React
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI Integration**: `@google/genai` for Gemini API calls
- **State Management**: Zustand
- **Client-Side Storage**: IndexedDB (via the `idb` library)

## File Structure

- **/index.html**: The main entry point of the application. It includes the root div, sets up Tailwind CSS, and contains the import map for dependencies.
- **/index.tsx**: Mounts the main React `App` component to the DOM.
- **/App.tsx**: The root component of the application. It handles routing between different tool tabs and renders global components like the Sidebar, Toasts, and Modals.
- **/components/**: Contains all React components.
  - **/components/tabs/**: Houses the main feature components, each corresponding to a tool in the sidebar (e.g., `AdGeneratorTab.tsx`, `LibraryTab.tsx`).
  - **/components/library/**: Contains components specific to the new, advanced library feature.
  - **/components/icons/**: A collection of SVG icon components.
- **/services/geminiService.ts**: A dedicated module for abstracting all interactions with the Google GenAI (Gemini) API. It handles prompt construction, API calls for text and image generation, and error handling.
- **/store.ts**: Defines the global application state using Zustand. It manages everything from the active tool tab to the contents of the image library.
- **/utils/db.ts**: Manages all interactions with IndexedDB. It abstracts the logic for creating, reading, updating, and deleting images and folders from the client-side database.
- **/types.ts**: Contains all TypeScript type and interface definitions used across the application, providing a single source of truth for data structures.
- **/prompts.ts**: Stores a collection of pre-defined system and user prompts used for various AI tasks, keeping prompt engineering separate from application logic.

## State Management (Zustand)

Global state is managed by a single Zustand store defined in `store.ts`. This approach centralizes state logic and makes it accessible to any component without prop drilling.

- **Store Structure**: The store is created with the `immer` middleware to allow for safe and easy mutation of state.
- **Accessing State**: Components access state and actions using the `useAppStore` hook.
  ```tsx
  import { useAppStore } from '../store';

  const MyComponent = () => {
    const activeTab = useAppStore(state => state.activeTab);
    const selectTab = useAppStore(state => state.selectTab);
    // ...
  };
  ```
- **Key State Slices**:
  - `library`: An array of all `LibraryImage` objects.
  - `folders`: An array of all `Folder` objects.
  - `activeTab`: The currently selected tool.
  - `toasts`: An array of active toast notifications.

## Data Persistence (IndexedDB)

Due to browser storage limitations with `localStorage` for large image data, the application uses IndexedDB for all persistent client-side storage.

- **DB Wrapper**: The `idb` library is used to simplify IndexedDB operations. All database logic is centralized in `utils/db.ts`.
- **Schema**: The database (`ai-studio-db`) contains two main object stores:
  1.  `images`: Stores `LibraryImage` objects, keyed by their unique `id`.
  2.  `folders`: Stores `Folder` objects, keyed by their unique `id`.
- **Data Flow**:
  1.  On application startup (`initializeApp` in `store.ts`), data from IndexedDB is loaded into the Zustand store.
  2.  When a user creates, updates, or deletes an asset (image or folder), the corresponding action in the store first performs the operation on IndexedDB via functions from `utils/db.ts`.
  3.  After the database operation is successful, the state in the Zustand store is updated to reflect the change, causing the UI to re-render.

This ensures that the application state is always in sync with the persistent storage and provides a robust offline-capable experience.

## Client-Side Sharing

The application supports sharing images via self-contained URLs. This is achieved by serializing the image data (as a data URL) and its metadata into a JSON object, which is then Base64-encoded and appended to the application's URL as a hash fragment (`#share=...`). When the app loads, it checks for this hash, parses the data, and displays the image in a special read-only viewer. This allows for stateless, serverless sharing of assets.