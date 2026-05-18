# BOOTSTRAP

This file is the practical setup and deployment guide for **Insanely Great Writer**.

## Hosting

The app is currently hosted on **Fly.io**.

Current Fly app:

- `insanely-great-writer-holy-fog-4587`

Current production URL:

- `https://www.manuscriptos.com/`

Notes:

- This app is deployed as a **single Fly machine**
- It uses a **Fly volume** mounted at `/rails/storage`
- Production uses **SQLite**, not Postgres

## Database setup

This app uses SQLite in all environments.

Local files:

- `storage/development.sqlite3`
- `storage/test.sqlite3`

Production files on Fly volume:

- `storage/production.sqlite3`
- `storage/production_cache.sqlite3`
- `storage/production_queue.sqlite3`
- `storage/production_cable.sqlite3`

Because production uses SQLite, keep this as a **single-machine deployment** unless the architecture is intentionally changed.

## Local setup

Requirements:

- Ruby `4.0.1`
- Homebrew packages: `rbenv`, `ruby-build`, `sqlite`, `libyaml`, `openssl@3`, `readline`, `zlib`, `libffi`, `vips`

Basic setup:

```zsh
cd /Users/ataxali/dev/insanely_great_writer
bundle install
bin/rails db:prepare
bin/dev
```

## Local environment variables

This repo now uses `dotenv-rails`, so local `.env` files are supported.

Use `.env.development` for local secrets.

Example:

```env
SMTP_ADDRESS=smtp.porkbun.com
SMTP_PORT=587
SMTP_USERNAME=hey@manuscriptos.com
SMTP_PASSWORD=your-real-password
SMTP_DOMAIN=manuscriptos.com
DEVISE_MAILER_SENDER=hey@manuscriptos.com
APP_HOST=localhost
APP_PORT=3000
```

Reference example file:

- `.env.example`

## Email

Authentication email is handled by:

- Rails `ActionMailer`
- Devise `confirmable`

The app does **not** currently use Resend in code.

It sends mail through SMTP using:

- `SMTP_ADDRESS`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_DOMAIN`
- `DEVISE_MAILER_SENDER`

Current SMTP provider in use:

- Porkbun mail (`smtp.porkbun.com`)

## Fly environment and secrets

Fly runtime config lives in:

- `fly.toml`

Important Fly env values currently expected:

- `APP_HOST=www.manuscriptos.com`
- `APP_PORT=443`
- `SOLID_QUEUE_IN_PUMA=true`
- `RAILS_LOG_LEVEL=info`

Fly secrets that must exist:

- `SMTP_ADDRESS`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_DOMAIN`
- `DEVISE_MAILER_SENDER`
- `SECRET_KEY_BASE`

Important:

- We are currently using `SECRET_KEY_BASE` on Fly
- `config/master.key` is not present in this repo
- `RAILS_MASTER_KEY` is therefore not part of the current known working deploy path

## Deploy commands

Main deploy command:

```zsh
cd /Users/ataxali/dev/insanely_great_writer
flyctl deploy -a insanely-great-writer-holy-fog-4587
```

Useful Fly commands:

```zsh
flyctl status -a insanely-great-writer-holy-fog-4587
flyctl logs -a insanely-great-writer-holy-fog-4587
flyctl open -a insanely-great-writer-holy-fog-4587
```

If secrets need to be updated:

```zsh
flyctl secrets set KEY=value -a insanely-great-writer-holy-fog-4587
```

## Shell alias

A deploy alias was added to `~/.zshrc`:

```zsh
igw-deploy
```

It expands to:

```zsh
cd /Users/ataxali/dev/insanely_great_writer && flyctl deploy -a insanely-great-writer-holy-fog-4587
```

After shell changes, reload with:

```zsh
source ~/.zshrc
```

## Known deployment fixes already made

The current working deploy required these changes:

- production SMTP config was made safe during Docker asset precompile
- Fly was configured to route to internal port `3000`
- the container was changed to run Rails directly on `0.0.0.0:3000`
- `SECRET_KEY_BASE` was added as a Fly secret

## Files that matter for deployment

- `Dockerfile`
- `fly.toml`
- `config/environments/production.rb`
- `.env.example`

## Quick start for a new person

1. Install Ruby `4.0.1` and the Homebrew dependencies.
2. Create `.env.development` from `.env.example`.
3. Run `bundle install`.
4. Run `bin/rails db:prepare`.
5. Run `bin/dev`.
6. For production deploys, make sure Fly secrets are set.
7. Deploy with `igw-deploy` or `flyctl deploy -a insanely-great-writer-holy-fog-4587`.
