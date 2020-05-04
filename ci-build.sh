# Script to be run every time the project is built on SemaphoreCI
# https://semaphoreci.com/docs/available-environment-variables.html
# We want the script to be run either:
# - from the scheduler (every morning)
# - manually (if for some reason the automatic building process has failed)
# but not after every push to the `master` branch.
SOURCE="$SEMAPHORE_TRIGGER_SOURCE"
BRANCH="$BRANCH_NAME"
if [ "$SOURCE" == "scheduler" ] || [ "$SOURCE" == "manual" ] ; then
  if [ "$BRANCH" == "master"] ; then
    echo "Launching the daily build..."
    npm run daily
  fi
  if [ "$BRANCH" == "npm" ] ; then
    # Specific script on `npm` branch
    # https://semaphoreci.com/docs/running-build-command-on-specific-branch.html
    echo "Launching the `npm` script to update the database"
    npm run daily-npm-update
  fi
else
  echo "No daily build script to launch."
fi