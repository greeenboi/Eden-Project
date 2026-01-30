@echo off
setlocal

rem This script builds and tags the Docker image for the yt-downloader-worker.
rem It prepares the image for upload to GitHub Container Registry (ghcr.io).

rem --- Configuration ---
rem The target image name on GitHub Container Registry.
set "IMAGE_NAME=ghcr.io/greeenboi/yt-downloader-worker"

rem --- Versioning ---
rem The script uses the first command-line argument as the version tag.
rem If no argument is provided, it defaults to using the short hash of the latest git commit.
set "VERSION_TAG=%1"

rem If VERSION_TAG is empty, get it from git.
if not defined VERSION_TAG (
    for /f "tokens=*" %%a in ('git rev-parse --short HEAD') do set "VERSION_TAG=%%a"
)

rem Exit if no version tag can be determined.
if not defined VERSION_TAG (
    echo Error: Could not determine version tag.
    echo Please provide a tag as an argument (e.g., release.bat v1.0.0^) or run this in a git repository.
    exit /b 1
)

echo --- Building and Tagging Docker Image ---
echo Image: %IMAGE_NAME%
echo Version: %VERSION_TAG%
echo Latest: true
echo ---------------------------------------

rem --- Build ---
echo.
echo [1/3] Building Docker image...
docker build -t "%IMAGE_NAME%:%VERSION_TAG%" .
if %ERRORLEVEL% neq 0 (
    echo.
    echo Docker build failed.
    exit /b %ERRORLEVEL%
)
echo Build successful.

rem --- Tagging ---
echo.
echo [2/3] Tagging image as 'latest'...
docker tag "%IMAGE_NAME%:%VERSION_TAG%" "%IMAGE_NAME%:latest"
if %ERRORLEVEL% neq 0 (
    echo.
    echo Docker tag failed.
    exit /b %ERRORLEVEL%
)
echo Tagging successful.

rem --- Push Instructions ---
echo.
echo [3/3] Process complete. Ready to push.
echo.
echo To push the image to GitHub Container Registry, run the following commands:
echo ----------------------------------------------------------------------
echo First, log in to ghcr.io (you only need to do this once^):
echo    docker login ghcr.io -u YOUR_GITHUB_USERNAME
echo.
echo Then, push the tags:
echo    docker push %IMAGE_NAME%:%VERSION_TAG%
echo    docker push %IMAGE_NAME%:latest
echo ----------------------------------------------------------------------

endlocal
exit /b 0
