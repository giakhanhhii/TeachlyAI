
$branch = "more-ui-features"
$target = "main"
$file = "README.md"

for ($i = 1; $i -le 10; $i++) {
    Write-Host "Starting iteration $i..."
    
    # Read content
    $content = Get-Content $file -Raw
    
    # Add or remove dot based on i (odd add, even remove)
    if ($i % 2 -ne 0) {
        # Odd: Add a dot at the end if not present
        if ($content -notmatch "\.\r?\n?$") {
            $content = $content.TrimEnd() + "."
            Write-Host "Adding dot..."
        }
    } else {
        # Even: Remove dot at the end if present
        if ($content -match "\.\r?\n?$") {
            $content = $content.Substring(0, $content.Length - 1).TrimEnd()
            Write-Host "Removing dot..."
        }
    }
    
    # Write back
    Set-Content $file $content
    
    # Git operations
    git add $file
    git commit -m "fix $i"
    git push origin $branch
    
    # Merge to main
    git checkout $target
    git merge $branch --no-edit
    git push origin $target
    git checkout $branch
    
    Write-Host "Iteration $i complete. Waiting 10 seconds..."
    if ($i -lt 10) {
        Start-Sleep -Seconds 10
    }
}
Write-Host "Task finished."
