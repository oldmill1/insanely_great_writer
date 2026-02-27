# AGENTS.md

## Cursor Cloud specific instructions

### Overview

**Insanely Great Writer** (manuscriptOS) is a Ruby on Rails 8.1 monolith — a writing/document editor with a retro Mac OS 9-inspired desktop UI. It uses SQLite for everything (database, cache, queue, cable), so no external services are needed.

### Prerequisites

- **Ruby 4.0.1** via rbenv (installed at `~/.rbenv`); ensure rbenv shims are on `PATH`.
- **System packages**: `sqlite3`, `libvips-dev`, `libyaml-dev`, `libssl-dev`, `libreadline-dev`, `zlib1g-dev`, `libffi-dev`.

### Key commands

| Task | Command |
|---|---|
| Install gems | `bundle install` |
| Prepare database | `bin/rails db:prepare` |
| Run dev server (web + CSS watcher) | `bin/dev` |
| Run Rails server only | `bin/rails server -p 3000` |
| Build CSS once | `bin/rails dartsass:build` |
| Run tests | `bin/rails test` |
| Run linter | `bin/rubocop` |
| Run security scan | `bin/brakeman` |

### Testing preferences

- Do NOT record screen videos unless the user explicitly asks for one. Screenshots and terminal output are sufficient for demonstrating changes.

### Gotchas

- Devise is configured with `:confirmable`. To create a test user in the Rails console, call `user.skip_confirmation!` before saving.
- The app uses `dartsass-rails` for CSS. The `bin/dev` command runs both the Rails server and the Sass watcher via Foreman (`Procfile.dev`). If running the server manually with `bin/rails server`, build CSS first with `bin/rails dartsass:build`.
- No Node.js or npm is needed; the app uses `importmap-rails` for JavaScript.
- Database files are SQLite and located in `storage/` (dev/test/prod). The `db:prepare` command is idempotent.
