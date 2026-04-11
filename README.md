# Reoclo Run (`@reoclo/run`)

Execute commands on [Reoclo](https://reoclo.com)-managed servers from GitHub Actions.

Reoclo acts as the execution proxy - your GitHub Actions workflow orchestrates the steps, Reoclo dispatches commands to your servers via its runner agent, and every operation is fully audited.

## Quick Start

```yaml
- name: Deploy on server
  uses: reoclo/run@v1
  with:
    api_key: ${{ secrets.REOCLO_API_KEY }}
    server_id: ${{ secrets.REOCLO_SERVER_ID }}
    command: |
      cd /opt/app && docker compose pull && docker compose up -d
    timeout: 300
```

## Setup

1. **Create an Automation API key** in the Reoclo dashboard: navigate to **API Keys**, select the **Automation Keys** tab, and click **Create Key**
2. Scope the key to specific servers and operations (exec, deploy, restart, reboot)
3. Add the key as a GitHub Actions secret: `REOCLO_API_KEY`
4. Add your target server ID as a secret: `REOCLO_SERVER_ID`

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
  uses: reoclo/run@v1
  with:
    api_key: ${{ secrets.REOCLO_API_KEY }}
    server_id: ${{ secrets.REOCLO_SERVER_ID }}
    command: |
      cd /opt/app && docker compose exec -T api python manage.py migrate
    timeout: 120
```

### Pass secrets from Bitwarden/1Password

```yaml
- name: Fetch secrets
  uses: bitwarden/sm-action@v2
  with:
    access_token: ${{ secrets.BW_ACCESS_TOKEN }}
    secrets: |
      abc123 > DB_URL
      def456 > API_SECRET

- name: Deploy with secrets
  uses: reoclo/run@v1
  with:
    api_key: ${{ secrets.REOCLO_API_KEY }}
    server_id: ${{ secrets.REOCLO_SERVER_ID }}
    command: |
      docker compose up -d
    working_directory: /opt/app
    env: |
      DB_URL=${{ env.DB_URL }}
      API_SECRET=${{ env.API_SECRET }}
    timeout: 300
```

### Build and deploy a Docker image

```yaml
- name: Build image on server
  uses: reoclo/run@v1
  with:
    api_key: ${{ secrets.REOCLO_API_KEY }}
    server_id: ${{ secrets.REOCLO_SERVER_ID }}
    working_directory: /opt/deploy/workspace
    command: |
      git pull origin main
      docker build -t myapp:latest .
      docker compose up -d
    timeout: 600
```

### Check command result

```yaml
- name: Health check
  id: health
  uses: reoclo/run@v1
  with:
    api_key: ${{ secrets.REOCLO_API_KEY }}
    server_id: ${{ secrets.REOCLO_SERVER_ID }}
    command: curl -sf http://localhost:3000/health

- name: Report status
  if: always()
  run: |
    echo "Exit code: ${{ steps.health.outputs.exit_code }}"
    echo "Output: ${{ steps.health.outputs.stdout }}"
```

## How It Works

1. Your workflow calls `reoclo/run@v1` with a command
2. The action sends the command to the Reoclo API (`POST /api/automation/v1/exec`)
3. Reoclo dispatches the command to the runner agent on your server via WebSocket
4. The runner executes the command and returns stdout/stderr/exit code
5. Reoclo logs the full operation for audit (command, result, who triggered it, which workflow)
6. The action sets outputs so your workflow can use the results

Every operation is correlated to the GitHub Actions run via `run_id` and `run_context`, so you can trace back from the Reoclo audit log to the exact workflow run.

## API Key Scoping

Automation API keys support fine-grained permissions:

- **Server scope**: restrict which servers the key can target
- **Operation scope**: restrict to specific operations (exec, deploy, restart, reboot)
- **IP allowlist**: restrict to specific IP ranges (e.g., GitHub-hosted runner IPs)
- **Rate limiting**: configurable per-key rate limit (default: 100 req/min)
- **Expiration**: optional expiry date

## Self-Hosted Reoclo

If you're running a self-hosted Reoclo instance, set the `api_url` input:

```yaml
- uses: reoclo/run@v1
  with:
    api_key: ${{ secrets.REOCLO_API_KEY }}
    server_id: ${{ secrets.REOCLO_SERVER_ID }}
    api_url: https://your-reoclo-instance.com
    command: echo "hello from self-hosted"
```

## License

MIT
