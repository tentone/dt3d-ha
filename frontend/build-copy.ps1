# Build the code using npm
Write-Host "Building code"
npm run build

# Check if the build was successful
if ($LASTEXITCODE -eq 0) {
    # Define source and destination paths
    $sourcePath = "../dt3d-card.js"
    $destinationPath = "W:\www"

    # Copy the file to the destination
    if (Test-Path $sourcePath) {
        Copy-Item -Path $sourcePath -Destination $destinationPath -Force
        Write-Host "File copied successfully to $destinationPath"
    } else {
        Write-Host "Source file not found: $sourcePath"
    }
} else {
    Write-Host "Build failed. Please check the error messages above."
}