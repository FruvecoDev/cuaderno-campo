#!/usr/bin/env bash
# Pre-commit helper: corre jest --findRelatedTests sólo para archivos
# .js/.jsx staged bajo frontend/src/.
#
# Recibe rutas absolutas o relativas al root del repo desde pre-commit.
set -e

rel_files=()
for f in "$@"; do
  case "$f" in
    frontend/src/*) rel_files+=("${f#frontend/}") ;;
  esac
done

# Sin archivos aplicables → salir OK (otros archivos no js/jsx pasaron el filtro
# pero pueden no coincidir con frontend/src/).
if [ ${#rel_files[@]} -eq 0 ]; then
  exit 0
fi

cd "$(dirname "$0")/../frontend"
CI=true yarn --silent test \
  --watchAll=false \
  --findRelatedTests \
  --passWithNoTests \
  "${rel_files[@]}"
