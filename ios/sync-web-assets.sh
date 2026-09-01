#!/bin/sh
# Xcode build phase: copy the web app into the app bundle as www/.
#
# Delegates to the repo-root script that the Android build also uses, so both
# wrappers bundle byte-identical assets and neither can drift from the web app.
# That script also fails the build if anything it copies references an absolute
# URL — this app must work with the device in aeroplane mode.
set -eu

"${SRCROOT}/../scripts/sync-web-assets.sh" \
  "${BUILT_PRODUCTS_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}/www"
