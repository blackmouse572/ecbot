#!/usr/bin/env bash
# Applies the Cloud Monitoring log-based metrics and alert policies under
# scripts/monitoring/ to one GCP project. Idempotent: re-running updates the
# existing metric and policies instead of duplicating them.
#
# Usage:
#   scripts/apply-monitoring.sh <project-id> <notification-channel-id>
#   MONITORING_NOTIFICATION_CHANNEL=<channel-id> scripts/apply-monitoring.sh <project-id>
#
# The notification channel id is the last path segment of
#   projects/<project-id>/notificationChannels/<id>
# It is never hardcoded: pass the id for the environment being configured.
set -euo pipefail

PROJECT="${1:-}"
CHANNEL="${2:-${MONITORING_NOTIFICATION_CHANNEL:-}}"
CONFIG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/monitoring"

if [[ -z "$PROJECT" || -z "$CHANNEL" ]]; then
    echo "usage: $0 <project-id> <notification-channel-id>" >&2
    echo "   or: MONITORING_NOTIFICATION_CHANNEL=<id> $0 <project-id>" >&2
    exit 2
fi

command -v gcloud >/dev/null || {
    echo "gcloud is required" >&2
    exit 1
}
command -v jq >/dev/null || {
    echo "jq is required" >&2
    exit 1
}

CHANNEL_PATH="projects/${PROJECT}/notificationChannels/${CHANNEL}"

# The metric name is the file name: reply-missed.metric.json -> reply_missed.
# It becomes the user metric type logging.googleapis.com/user/reply_missed.
apply_metric() {
    local file="$1"
    local metric
    metric="$(basename "$file" .metric.json | tr '-' '_')"

    if gcloud logging metrics describe "$metric" --project="$PROJECT" >/dev/null 2>&1; then
        gcloud logging metrics update "$metric" \
            --project="$PROJECT" \
            --config-from-file="$file"
    else
        gcloud logging metrics create "$metric" \
            --project="$PROJECT" \
            --config-from-file="$file"
    fi

    echo "metric ${metric} applied"
}

apply_policy() {
    local file="$1"
    local display
    local existing
    local rendered

    display="$(jq -r '.displayName' "$file")"
    # displayName is the only stable handle: the policy id is generated.
    existing="$(
        gcloud monitoring policies list \
            --project="$PROJECT" \
            --format='value(name,displayName)' |
            awk -F '\t' -v d="$display" '$2 == d { print $1; exit }'
    )"

    rendered="$(mktemp)"
    jq --arg channel "$CHANNEL_PATH" \
        '.notificationChannels = [$channel]' "$file" >"$rendered"

    if [[ -n "$existing" ]]; then
        gcloud monitoring policies update "$existing" \
            --project="$PROJECT" \
            --policy-from-file="$rendered"
    else
        gcloud monitoring policies create \
            --project="$PROJECT" \
            --policy-from-file="$rendered"
    fi

    rm -f "$rendered"
    echo "policy ${display} applied"
}

for file in "$CONFIG_DIR"/*.metric.json; do
    apply_metric "$file"
done

for file in "$CONFIG_DIR"/*.policy.json; do
    apply_policy "$file"
done
