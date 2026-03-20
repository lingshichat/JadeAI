#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

usage() {
  cat <<'EOF'
Usage: ./docker_run_local.sh <command>

Commands:
  start    Start JadeAI in the background
  stop     Stop the running container
  restart  Restart the running container
  down     Remove the container and network
  logs     Follow container logs
  status   Show container status
  pull     Pull the latest image, then start
  help     Show this help

Examples:
  ./docker_run_local.sh start
  ./docker_run_local.sh logs
EOF
}

command="${1:-start}"

case "$command" in
  start)
    docker compose up -d
    ;;
  stop)
    docker compose stop
    ;;
  restart)
    docker compose restart
    ;;
  down)
    docker compose down
    ;;
  logs)
    docker compose logs -f app
    ;;
  status)
    docker compose ps
    ;;
  pull)
    docker compose pull
    docker compose up -d
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    echo "Unknown command: $command" >&2
    echo >&2
    usage >&2
    exit 1
    ;;
esac
