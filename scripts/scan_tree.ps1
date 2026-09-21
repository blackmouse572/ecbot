param (
    [Parameter(Mandatory=$false)]
    [Alias("p")]
    [string]$Path = "."
)

# 1. Ensure we are in a git repository
git rev-parse --is-inside-work-tree >$null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Error: This script must be run inside a Git repository."
    exit 1
}

# 2. Get absolute paths safely resolving from your Current Working Directory
$resolvedPath = If ([System.IO.Path]::IsPathRooted($Path)) { $Path } Else { Join-Path $PWD $Path }
if (-not (Test-Path $resolvedPath)) {
    Write-Error "Error: Path '$resolvedPath' does not exist."
    exit 1
}

$targetAbs = (Get-Item $resolvedPath).FullName
$repoRoot = (Get-Item (git rev-parse --show-toplevel)).FullName

# 3. Calculate exact repo-relative path for Git using Uri mapping (handles slashes natively)
$uriRoot = [uri]($repoRoot + "\")
$uriTarget = [uri]($targetAbs + "\")
$targetRel = [uri]::UnescapeDataString($uriRoot.MakeRelativeUri($uriTarget).ToString()).TrimEnd('/')

Write-Output "# Project Structure ($Path)"

# 4. Query ONLY the targeted subtree from Git to save memory
if ($targetRel -eq "") {
    $gitFiles = git -C $repoRoot ls-files --cached --others --exclude-standard
} else {
    $gitFiles = git -C $repoRoot ls-files --cached --others --exclude-standard -- $targetRel
}

# 5. Build the tree map using a Dictionary (Hash Map) for safety and speed
$items = [System.Collections.Generic.Dictionary[string, pscustomobject]]::new()

foreach ($rawFile in $gitFiles) {
    # Ensure forward slashes for cross-platform consistency
    $file = $rawFile -replace '\\', '/'
    
    # Strip the leading target directory path to calculate local structure
    $localPath = $file
    if ($targetRel -ne "" -and $file.StartsWith($targetRel + "/", [System.StringComparison]::OrdinalIgnoreCase)) {
        $localPath = $file.Substring($targetRel.Length + 1)
    } elseif ($targetRel -ne "" -and $file -eq $targetRel) {
        $localPath = [System.IO.Path]::GetFileName($file)
    }

    # Strict .NET string split prevents PowerShell array-unwrapping bugs
    $parts = $localPath.Split([char[]]'/', [System.StringSplitOptions]::RemoveEmptyEntries)
    
    $accumulated = ""
    for ($i = 0; $i -lt $parts.Length; $i++) {
        $part = $parts[$i]
        $isLast = ($i -eq ($parts.Length - 1))
        
        if ($accumulated -eq "") {
            $accumulated = $part
        } else {
            $accumulated = $accumulated + "/" + $part
        }

        # Populate dictionary
        if (-not $items.ContainsKey($accumulated)) {
            $items[$accumulated] = [PSCustomObject]@{
                LocalPath = $accumulated
                Name      = $part
                Depth     = $i
                IsDir     = -not $isLast # If it has children, it's a directory
            }
        } else {
            # Update to directory if we encounter it as a parent later
            if (-not $isLast) {
                $items[$accumulated].IsDir = $true
            }
        }
    }
}

# 6. Sort alphabetically and print safely
$sortedValues = $items.Values | Sort-Object { $_.LocalPath }

foreach ($item in $sortedValues) {
    $indent = "|   " * $item.Depth
    $trailingSlash = if ($item.IsDir) { "/" } else { "" }
    Write-Output "${indent}+-- $($item.Name)${trailingSlash}"
}
