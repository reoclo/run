# Reoclo Run (`@reoclo/run`)

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-Reoclo%20Run-2188ff?logo=github&logoColor=white)](https://github.com/marketplace/actions/reoclo-run)
[![Release](https://img.shields.io/github/v/release/reoclo/run?logo=github&label=release&color=2188ff&sort=semver)](https://github.com/reoclo/run/releases/latest)
[![CI](https://github.com/reoclo/run/actions/workflows/ci.yml/badge.svg)](https://github.com/reoclo/run/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

Execute commands on [Reoclo](https://reoclo.com) managed servers from GitHub Actions.

Reoclo acts as the execution proxy: your GitHub Actions workflow orchestrates the steps, Reoclo dispatches commands to your servers via its runner agent, and every operation is fully audited.

## Why

GitHub-hosted runners cannot reach private servers without copying SSH keys into GitHub Secrets and giving every workflow shell-level access. `@reoclo/run` keeps that out of CI:

- **No SSH keys in GitHub Secrets.** Authentication is a scoped Reoclo automation key, not a server credential.
- **Per-key access control.** Each key is allowed only the operations and servers you authorize it for.
- **Full audit trail.** Every command is recorded with the originating repository, workflow, actor, and commit.
- **Pairs with [`@reoclo/checkout`](https://github.com/reoclo/checkout) and [`@reoclo/docker-auth`](https://github.com/reoclo/docker-auth)** for full deploy workflows.

## Quick Start

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy on server
        uses: reoclo/run@v2
        with:
          api_key: ${{ secrets.REOCLO_API_KEY }}
          server_id: ${{ secrets.REOCLO_SERVER_ID }}
          command: |
            cd /opt/app && docker compose pull && docker compose up -d
          timeout: 300
```

## Setup

1. Create an Automation API key in the Reoclo dashboard. Navigate to **API Keys**, select the **Automation Keys** tab, and click **Create Key**.
2. Scope the key to specific servers and operations (`exec`, `deploy`, `restart`, `reboot`).
3. Add the key as a GitHub Actions secret: `REOCLO_API_KEY`.
4. Add your target server ID as a secret: `REOCLO_SERVER_ID`.

For detailed setup instructions, see the [Reoclo documentation](https://docs.reoclo.com/guides/github-actions).

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `api_key` | yes | - | Reoclo automation API key |
| `server_id` | yes | - | Target server ID |
| `command` | yes | - | Shell command to execute on the server |
| `working_directory` | no | - | Working directory on the server |
| `env` | no | - | Environment variables (KEY=VALUE, one per line) |
| `timeout` | no | `60` | Timeout in seconds (max 900) |
| `api_url` | no | `https://api.reoclo.com` | Reoclo API URL (for self-hosted instances) |

## Outputs

| Output | Description |
|--------|-------------|
| `exit_code` | Command exit code |
| `stdout` | Command stdout (truncated to 64KB) |
| `stderr` | Command stderr (truncated to 64KB) |
| `operation_id` | Reoclo automation operation ID |
| `duration_ms` | Execution duration in milliseconds |

## Examples

### Run a migration script

```yaml
- name: Run database migration
  uses: reoclo/run@v2
  with:
    api_key: ${{ secrets.REOCLO_API_KEY }}
    server_id: ${{ secrets.REOCLO_SERVER_ID }}
    command: |
      cd /opt/app && ./scripts/migrate.sh
    timeout: 600
```

### Pass secrets from Bitwarden / 1Password

```yaml
- name: Fetch secret from Bitwarden
  id: bw
  uses: bitwarden/sm-action@v1
  with:
    access_token: ${{ secrets.BW_ACCESS_TOKEN }}
    secrets: |
      <id> > DB_PASSWORD

- name: Run with injected env
  uses: reoclo/run@v2
  with:
    api_key: ${{ secrets.REOCLO_API_KEY }}
    server_id: ${{ secrets.REOCLO_SERVER_ID }}
    env: |
      DB_PASSWORD=${{ steps.bw.outputs.DB_PASSWORD }}
    command: psql -c 'SELECT 1'
```

### Build and deploy a Docker image

```yaml
- uses: reoclo/checkout@v2
  with:
    api_key: ${{ secrets.REOCLO_API_KEY }}
    server_id: ${{ secrets.REOCLO_SERVER_ID }}

- uses: reoclo/run@v2
  with:
    api_key: ${{ secrets.REOCLO_API_KEY }}
    server_id: ${{ secrets.REOCLO_SERVER_ID }}
    working_directory: /opt/deploy/workspace
    command: |
      docker compose build
      docker compose up -d
    timeout: 600
```

### Check command result

```yaml
- id: deploy
  uses: reoclo/run@v2
  with:
    api_key: ${{ secrets.REOCLO_API_KEY }}
    server_id: ${{ secrets.REOCLO_SERVER_ID }}
    command: ./deploy.sh

- if: steps.deploy.outputs.exit_code != '0'
  run: echo 'deploy failed in ${{ steps.deploy.outputs.duration_ms }}ms'
```

## How It Works

`v2` is a thin wrapper around the [`reoclo` CLI](https://github.com/reoclo/cli) (the same
engine that powers Gitea Actions and Woodpecker), so behaviour is identical across CI systems:

1. A composite step installs the pinned `reoclo` CLI (downloaded once per job; no Node runtime needed).
2. It runs `reoclo exec <server_id> … --output json` with `REOCLO_AUTOMATION_KEY` from `api_key`.
3. The CLI calls the Reoclo automation API, which dispatches the command to the target server's
   runner agent and streams stdout / stderr back.
4. The CLI exits with the remote command's exit code, so the step fails naturally when the command fails.
5. stdout, stderr, exit_code, operation_id, and duration_ms are parsed from the JSON output and
   mapped to this action's outputs.

`jq` is used to parse the CLI's JSON output; it is preinstalled on GitHub-hosted and standard
Gitea `act_runner` images.

## API Key Scoping

Each automation API key has two scope dimensions:

- **Allowed Operations.** A subset of `exec`, `deploy`, `restart`, `reboot`, `registry_login`, `registry_logout`. Choose the smallest set the workflow needs.
- **Allowed Servers.** A list of server IDs the key can target. Use a different key per environment (staging, production) to limit blast radius.

A key with `exec` and a single allowed server ID is the conventional choice for a deploy workflow that uses `@reoclo/run` only.

## Gitea Actions

The repo is mirrored to `git.boxpositron.dev/reoclo/run`, so the same action runs on a
self-hosted Gitea `act_runner`:

```yaml
- uses: git.boxpositron.dev/reoclo/run@v2
  with:
    api_key: ${{ secrets.REOCLO_API_KEY }}
    server_id: ${{ secrets.REOCLO_SERVER_ID }}
    command: ./deploy.sh
```

## License

MIT
