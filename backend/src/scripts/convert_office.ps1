param(
    [string]$type,
    [string]$inputPath,
    [string]$outputPath
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $inputPath)) {
    Write-Error "Input file not found: $inputPath"
    exit 1
}

$outputDir = Split-Path -Parent $outputPath
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}

if ($type -eq "pptx" -or $type -eq "ppt") {
    try {
        $ppt = New-Object -ComObject PowerPoint.Application
        # msoTrue = -1, msoFalse = 0
        $presentation = $ppt.Presentations.Open($inputPath, -1, 0, 0)
        $slideCount = $presentation.Slides.Count
        
        # 32 = ppSaveAsPDF
        $presentation.SaveAs($outputPath, 32)
        $presentation.Close()
        $ppt.Quit()
        
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($ppt) | Out-Null
        Write-Host "SUCCESS: PPTX converted ($slideCount slides)"
        exit 0
    } catch {
        Write-Error "PowerPoint conversion error: $_"
        exit 1
    }
} elseif ($type -eq "docx" -or $type -eq "doc") {
    try {
        $word = New-Object -ComObject Word.Application
        $word.Visible = $false
        $doc = $word.Documents.Open($inputPath, $false, $true)
        
        # 17 = wdFormatPDF
        $doc.SaveAs2($outputPath, 17)
        $doc.Close($false)
        $word.Quit()
        
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
        Write-Host "SUCCESS: DOCX converted"
        exit 0
    } catch {
        Write-Error "Word conversion error: $_"
        exit 1
    }
} else {
    Write-Error "Unsupported file type: $type"
    exit 1
}
