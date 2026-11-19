#!/bin/sh
# Local candidate only. No installation, downloads, startup service or host switch.
set -eu
briar_package_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if [ "$#" -eq 0 ]; then
    set --
elif [ "$#" -eq 1 ] && [ "$1" = "--smoke" ]; then
    set -- -- --briar-smoke
else
    printf '%s\n' 'Usage: briar-presence [--smoke]' >&2
    exit 2
fi
briar_runtime_dir=${BRIAR_PRESENCE_RUNTIME:-${XDG_DATA_HOME:-$HOME/.local/share}/briar-presence/godot-candidate}
mkdir -p "$briar_runtime_dir/config" "$briar_runtime_dir/cache" "$briar_runtime_dir/data"
export XDG_CONFIG_HOME="$briar_runtime_dir/config"
export XDG_CACHE_HOME="$briar_runtime_dir/cache"
export XDG_DATA_HOME="$briar_runtime_dir/data"
exec "$briar_package_dir/godot" --main-pack "$briar_package_dir/briar-presence.pck" "$@"
