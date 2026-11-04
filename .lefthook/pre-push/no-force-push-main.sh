#!/bin/sh
# Refuses to rewrite or delete main. See scripts/hooks/no-force-push-main.mjs.
exec node scripts/hooks/no-force-push-main.mjs
