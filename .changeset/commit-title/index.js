/**
 * Custom changeset commit message formatter
 * Format: PACKAGE_NAME@VERSION
 */
async function getVersionMessage(releasePlan) {
  const messages = releasePlan.releases
    .filter((release) => release.type !== "none")
    .map((release) => `${release.name}@${release.newVersion}`);

  return messages.join("\n");
}

module.exports = { getVersionMessage };
