#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${ROOT_DIR}/production"
OUTPUT_ZIP="${OUTPUT_DIR}/document.zip"

# Use a project-local temporary directory when the shell does not define TMPDIR.
# The directory is cleaned up automatically when the script exits.
TMPDIR="${TMPDIR:-${ROOT_DIR}/.tmp}"
mkdir -p -- "${TMPDIR}"

for required in plugin.php core vendor templates; do
    if [[ ! -e "${ROOT_DIR}/${required}" ]]; then
        printf 'Missing required production path: %s\n' "${required}" >&2
        exit 1
    fi
done

cleanup() {
    if [[ -n "${WORK_DIR:-}" && -d "${WORK_DIR}" ]]; then
        rm -rf -- "${WORK_DIR}"
    fi
}
trap cleanup EXIT

printf 'Building production assets...\n'
cd -- "${ROOT_DIR}"
npm run build -- --mode production

if [[ ! -d "${ROOT_DIR}/dist" ]]; then
    printf 'Build completed without creating dist/.\n' >&2
    exit 1
fi

WORK_DIR="$(mktemp -d "${TMPDIR}/document-production.XXXXXX")"
PACKAGE_DIR="${WORK_DIR}/document"
mkdir -p -- "${PACKAGE_DIR}"

printf 'Collecting production runtime files...\n'
for path in plugin.php core dist vendor templates; do
    cp -a -- "${ROOT_DIR}/${path}" "${PACKAGE_DIR}/"
done

mkdir -p -- "${OUTPUT_DIR}"
rm -f -- "${OUTPUT_ZIP}"

if ! command -v zip >/dev/null 2>&1; then
    printf 'The zip command is required to create %s.\n' "${OUTPUT_ZIP}" >&2
    exit 1
fi

printf 'Creating %s...\n' "${OUTPUT_ZIP}"
(
    cd -- "${WORK_DIR}"
    zip -qr9 "${OUTPUT_ZIP}" document
)

printf 'Production archive created: %s\n' "${OUTPUT_ZIP}"
printf 'Included top-level paths: plugin.php, core/, dist/, vendor/, templates/\n'
