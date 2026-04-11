# Drag-n-Drop & Tree Management Ideas

## Current Implementation (Phase 4 Start)
- [ ] Basic recursive tree view in admin panel.
- [ ] Manual "Move Up", "Move Down", "Change Parent" controls.
- [ ] API support for `sort_order` and `parent_id` updates.

## Ideas for Future Enhancement
1. **Interactive Drag-and-Drop**:
    - Use a library like `@dnd-kit/core` or `vue-draggable-next`.
    - Visual feedback for nesting (e.g., highlighting target parent).
    - Preventing circular dependencies on the client side.
2. **Bulk Actions**:
    - Selecting multiple categories to move them to a new parent.
    - Bulk delete with sub-category handling options (delete all or move to parent).
3. **Search & Filter**:
    - Ability to filter the tree in real-time.
4. **Visual Icons**:
    - Custom icon picker for each category (aligned with Nuxt UI icons).
5. **Color Coding**:
    - Preview of how the category color will look in the Knowledge Graph.

## Progress Log
- 2026-04-10: Started Phase 4. Decided to go with a simple manual UI first to establish stable API and logic.
