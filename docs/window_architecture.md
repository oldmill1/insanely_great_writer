# Window Architecture

The desktop window system is split into three layers:

1. `WindowShell`
2. `WindowType`
3. `WindowContent`

## Shell

The shared shell owns the outer chrome only:

- titlebar
- traffic controls
- sizing and positioning data attributes
- frame mounting
- drag/resize/persist behavior

Canonical server entrypoint:

- `app/views/shared/_window_shell.html.erb`

Compatibility shim retained during migration:

- `app/views/shared/_ig_window.html.erb`

Shell data attributes are reserved for the shell contract:

- `data-desktop-window-key`
- `data-window-kind`
- `data-window-item-id`
- `data-window-title`
- `data-desktop-window-x`
- `data-desktop-window-y`
- `data-desktop-window-width`
- `data-desktop-window-height`

Do not let content controllers redefine or depend on these.

## Window Types

Window types define how a shell should be created for a given item kind.

Current kinds:

- `document`
- `folder`

JS registry:

- `app/javascript/window_registry.js`

Each entry defines:

- `kind`
- `defaultSize`
- `buildFrameId(itemId)`
- `buildFrameSrc(itemId, frameId)`
- `controls`
- `buildDataset(itemId)`
- `loadingText`

Server-rendered typed entrypoints:

- `app/views/shared/_document_window.html.erb`
- `app/views/shared/_folder_window.html.erb`

Helper methods that mirror the shell contract:

- `document_window_shell_options`
- `folder_window_shell_options`

## Window Content

Content routes remain frame payloads only:

- documents render the editor content
- folders render the browser content

Content routes must not render the outer shell.

## CSS Ownership

Use namespaces consistently:

- `ig-window__*` for shell chrome only
- `folder-window__*` for folder browsing only
- `document-window__*` for document window chrome/layout
- `doc-terminal-*` only for inner editor semantics

If a new window type needs shell-adjacent controls, add its namespace to the shared control styles rather than borrowing another type's classes.

## Adding A New Window Type

1. Add a registry entry in `app/javascript/window_registry.js`.
2. Add a typed server entrypoint partial if the type needs server-rendered shell support.
3. Render the type through `shared/_window_shell.html.erb` using the canonical shell locals.
4. Add a dedicated content namespace for its type-specific UI.
5. Add tests for:
   - shell contract
   - registry config
   - restore/open behavior
   - type-specific content render
