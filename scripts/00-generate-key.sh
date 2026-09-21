#!/bin/sh
set -e
echo "🚀 Starting Generate Key Script"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

if [ -z "$RELEASE_COMMAND" ]; then
    # Check if the keys folder exists
    echo -e "${BLUE}[INFO]${NC} Checking keys folder..."
    # Check if /app/keys exists
    if [ ! -d "/app/keys" ]; then
        echo -e "${RED}[WARNING]${NC} Keys folder does not exist, exiting..."
        exit 0
    else
        echo -e "${GREEN}[SUCCESS]${NC} Keys folder exists."
    fi

    # Check if the key file exists
    echo -e "${BLUE}[INFO]${NC} Checking for existing key file..."
    if [ -f "/app/keys/access-token.pem" ]; then
        echo -e "${YELLOW}[WARNING]${NC} Key file already exists, skipping generation."
    else
        echo -e "${BLUE}[INFO]${NC} Generating new key file..."
        pwd # Print current working directory for debugging
        # Generate a new key file
        pnpm run generate:keys -- generate ../../keys
        echo -e "${GREEN}[SUCCESS]${NC} Key file generated successfully."
    fi
else
    # Exit
    echo "Release command is set, skipping key generation."
    exit 0
fi

exec "$@"