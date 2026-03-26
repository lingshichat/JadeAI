#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

usage() {
  cat <<'EOF'
Usage: ./docker_run_local.sh <command>

Commands:
  start    Start RoleRover in the background
  stop     Stop the running container
  restart  Restart the running container
  down     Remove the container and network
  logs     Follow container logs
  status   Show container status
  build    Rebuild the local image, then start
  pull     Alias for build (kept for compatibility)
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
  build|pull)
    docker compose build
    docker compose up --build -d
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
