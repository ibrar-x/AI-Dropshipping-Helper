# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0] - 2024-08-04

### Added
- **Model Configuration**: Added a setting to choose a specific model for image upscaling, defaulting to "Imagen (v.002)".
- **Select from Library**: Added a "Select from Library" button to the start screens of the Ad Generator, Editor, Upscaler, and Blender tabs, allowing users to begin workflows with existing assets.

### Changed
- **Upscaling Workflow**: Upscaling an image from the Ad Generator's results now opens the upscaler in a modal, keeping the user in the context of their campaign results instead of switching to the Upscaler tab.

### Fixed
- **Visual Generator to Blender**: Fixed an issue where using a generated visual in the Blender tool would not correctly load the image. The selected image now appears as the initial layer in the Image Blender.

## [1.2.0] - 2024-08-03

### Added
- **Collaboration & Sharing**: Implemented a client-side sharing feature. Users can now generate a unique, self-contained link for any image in their library. This link embeds the image data and metadata directly into the URL hash, allowing for easy, serverless sharing with clients or teammates. A dedicated viewer will appear when the app is opened with a share link.

## [1.1.0] - 2024-08-02

### Fixed
- **Ad Generator Blending**: Improved the ad generation blending process. The AI is now provided with explicit coordinate hints for text and logo placement based on the user's layout in the placement step, resulting in more accurate compositions.
- **Library Actions**: Fixed an issue where the "Move" popover menu in the library's bulk actions bar would render off-screen. It now correctly appears above the action bar.
- **Model Configuration**: Resolved a bug in the Settings modal where the "Custom..." model input field would not work correctly. The logic has been refactored for reliability.
- **Content Safety**: The user's configured content safety settings are now correctly applied to all AI generation requests.

## [1.0.0] - 2024-08-01

### Added
- **Massive Library Overhaul**: The image library has been completely redesigned into a full-featured asset management system.
  - **Organization**:
    - **Folders**: Create, rename, and delete folders to group assets.
    - **Tags & Notes**: Add searchable tags and descriptive notes to any image.
    - **Favorites**: Mark any image as a favorite for quick access.
  - **Functionality**:
    - **Search**: Full-text search across image notes and tags.
    - **Sorting**: Sort assets by creation date.
    - **Multiple Views**: Toggle between a visual **Grid View** and a detailed **List View**.
    - **Bulk Actions**: Select multiple images to delete or move them between folders.
  - **Asset Management**:
    - **Image Detail Modal**: A comprehensive modal to view a large preview, edit metadata, and access actions.
    - **Automatic Metadata**: The prompt used to generate an image is now automatically saved with the asset.
    - **Enhanced Export**: Export images in different formats (PNG, JPG, WebP) directly from the detail view.
- **Developer Documentation**:
  - Added this `CHANGELOG.md` to track project updates.
  - Added `DOCUMENTATION.md` for developer reference on architecture, state management, and data persistence.

### Changed
- The core data model for images has been expanded to include rich metadata.
- Data persistence has been migrated to a new IndexedDB version to support folders and new image metadata.
- All image-generating tools now save relevant metadata (like prompts) upon asset creation.