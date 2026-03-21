# Deploy Fixes

This file documents the Fly.io deployment problems we hit, what they looked like, and what was changed to stabilize the app.

## App

- Fly app: `insanely-great-writer-holy-fog-4587`
- URL: `https://insanely-great-writer-holy-fog-4587.fly.dev/`

## Symptoms We Saw

- Fly dashboard flipping between `Deployed`, `Suspended`, and proxy errors
- Browser returning `502 Bad Gateway`
- Very slow page loads, then failed page loads
- Machine restart loops in Fly logs

## What Was Actually Happening

There were multiple deployment issues stacked on top of each other.

### 1. Fly web launch did not understand Ruby 4.0.1

The GitHub launch UI tried to use its own Ruby detection path and failed on `4.0.1`.

Resolution:

- stopped using the Fly web launch flow
- used `flyctl deploy` from the repo instead

### 2. Production asset build was too strict about SMTP env vars

During Docker build, Rails precompiled assets in production mode. Production mail config was reading SMTP values too aggressively, which can break builds before runtime secrets are available.

Resolution:

- updated [`config/environments/production.rb`](/Users/ataxali/dev/insanely_great_writer/config/environments/production.rb)
- SMTP config now only applies when `SMTP_ADDRESS` is present

### 3. The container was trying to bind port 80 as a non-root user

Fly logs showed the app failing with:

```text
Failed to start HTTP listener
listen tcp :80: bind: permission denied
```

Resolution:

- updated [`Dockerfile`](/Users/ataxali/dev/insanely_great_writer/Dockerfile)
- app now runs Rails directly on `0.0.0.0:3000`
- updated [`fly.toml`](/Users/ataxali/dev/insanely_great_writer/fly.toml) so Fly routes to internal port `3000`

### 4. Production was missing `SECRET_KEY_BASE`

After the port fix, production still needed a valid Rails secret key.

Resolution:

- set Fly secret `SECRET_KEY_BASE`

### 5. The machine still crash-looped because DB prep stopped running

This was the main reason the machine kept looking unstable even after the app sometimes appeared to work.

The app uses SQLite for:

- primary DB
- cache
- queue
- cable

That means startup has to prepare the DBs on the mounted Fly volume.

After we changed the container command to:

```zsh
./bin/rails server -b 0.0.0.0 -p 3000
```

the old logic in [`bin/docker-entrypoint`](/Users/ataxali/dev/insanely_great_writer/bin/docker-entrypoint) stopped matching, so `db:prepare` no longer ran on boot.

That caused runtime failures like:

```text
Could not find table 'solid_queue_recurring_tasks'
Detected Solid Queue has gone away, stopping Puma...
```

Fly would then:

- mark the machine unhealthy
- restart it
- show proxy errors or suspended states

Resolution:

- updated [`bin/docker-entrypoint`](/Users/ataxali/dev/insanely_great_writer/bin/docker-entrypoint)
- it now checks the first two args correctly and runs `./bin/rails db:prepare` when booting the Rails server

Current logic:

```bash
if [ "$1" == "./bin/rails" ] && [ "$2" == "server" ]; then
  ./bin/rails db:prepare
fi
```

## The Important Root Cause

The unstable Fly behavior was mostly not Fly being random.

The machine was repeatedly:

1. starting
2. booting Rails
3. hitting missing SQLite queue tables
4. shutting down
5. restarting

That is why the dashboard kept flipping between healthy-looking and unhealthy-looking states.

## Files Changed

- [`Dockerfile`](/Users/ataxali/dev/insanely_great_writer/Dockerfile)
- [`fly.toml`](/Users/ataxali/dev/insanely_great_writer/fly.toml)
- [`config/environments/production.rb`](/Users/ataxali/dev/insanely_great_writer/config/environments/production.rb)
- [`bin/docker-entrypoint`](/Users/ataxali/dev/insanely_great_writer/bin/docker-entrypoint)

## Fly Secrets Required

- `SMTP_ADDRESS`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_DOMAIN`
- `DEVISE_MAILER_SENDER`
- `SECRET_KEY_BASE`

## Commands We Used

Deploy:

```zsh
flyctl deploy -a insanely-great-writer-holy-fog-4587
```

Check status:

```zsh
flyctl status -a insanely-great-writer-holy-fog-4587
```

Check logs:

```zsh
flyctl logs -a insanely-great-writer-holy-fog-4587
```

Set secrets:

```zsh
flyctl secrets set KEY=value -a insanely-great-writer-holy-fog-4587
```

## If This Happens Again

Check these in order:

1. `flyctl status -a insanely-great-writer-holy-fog-4587`
2. `flyctl logs -a insanely-great-writer-holy-fog-4587`
3. Confirm the app is listening on port `3000`
4. Confirm `SECRET_KEY_BASE` exists on Fly
5. Confirm `bin/docker-entrypoint` is still running `db:prepare`
6. Look for missing SQLite tables, especially Solid Queue tables

## Bottom Line

The big fix was restoring database preparation during container startup after the server command changed.

That is what stopped the main crash loop.
