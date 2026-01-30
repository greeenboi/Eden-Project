#!/bin/sh
set -e

# This script builds and tags the Docker image for the yt-downloader-worker.
# It prepares the image for upload to GitHub Container Registry (ghcr.io).

# --- Configuration ---
# The target image name on GitHub Container Registry.
IMAGE_NAME="ghcr.io/greeenboi/yt-downloader-worker"

# --- Versioning ---
# The script uses the first command-line argument as the version tag.
# If no argument is provided, it defaults to using the short hash of the latest git commit.
VERSION_TAG=${1:-$(git rev-parse --short HEAD)}

# Exit if no version tag can be determined.
if [ -z "$VERSION_TAG" ]; then
    echo "Error: Could not determine version tag." >&2
    echo "Please provide a tag as an argument (e.g., ./release.sh v1.0.0) or run this in a git repository." >&2
    exit 1
fi

echo "--- Building and Tagging Docker Image ---"
echo "Image: $IMAGE_NAME"
echo "Version: $VERSION_TAG"
echo "Latest: true"
echo "---------------------------------------"

# --- Build ---
# Build the Docker image using the Dockerfile in the current directory.
# The image is tagged with the specific version.
echo "\n[1/3] Building Docker image..."
docker build -t "${IMAGE_NAME}:${VERSION_TAG}" .
if [ $? -ne 0 ]; then
    echo "\nDocker build failed." >&2
    exit 1
fi
echo "Build successful."

# --- Tagging ---
# Tag the newly built image with 'latest' for easy access.
echo "\n[2/3] Tagging image as 'latest'..."
docker tag "${IMAGE_NAME}:${VERSION_TAG}" "${IMAGE_NAME}:latest"
echo "Tagging successful."

# --- Push Instructions ---
# Provide the user with the necessary commands to push the image.
echo "\n[3/3] Process complete. Ready to push."
echo "\nTo push the image to GitHub Container Registry, run the following commands:"
echo "----------------------------------------------------------------------"
echo "First, log in to ghcr.io (you only need to do this once):"
echo "   docker login ghcr.io -u YOUR_GITHUB_USERNAME\n"
echo "Then, push the tags:"
echo "   docker push ${IMAGE_NAME}:${VERSION_TAG}"
echo "   docker push ${IMAGE_NAME}:latest"
echo "----------------------------------------------------------------------"

exit 0
