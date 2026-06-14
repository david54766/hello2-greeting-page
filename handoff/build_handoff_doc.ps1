param(
    [string]$MarkdownPath = "handoff\prima-donna-android-handoff.md",
    [string]$OutputDocx = "handoff\Prima Donna AI Android Handoff.docx",
    [string]$OutputPdf = "handoff\Prima Donna AI Android Handoff.pdf"
)

$ErrorActionPreference = "Stop"

function Pt($value) { return [double]$value }
function Inches($value) { return [double]$value * 72.0 }

$markdown = Get-Content -LiteralPath $MarkdownPath
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

try {
    $doc = $word.Documents.Add()
    $doc.PageSetup.TopMargin = Inches 0.85
    $doc.PageSetup.BottomMargin = Inches 0.75
    $doc.PageSetup.LeftMargin = Inches 0.85
    $doc.PageSetup.RightMargin = Inches 0.85

    $normal = $doc.Styles.Item("Normal")
    $normal.Font.Name = "Calibri"
    $normal.Font.Size = 11
    $normal.ParagraphFormat.SpaceAfter = 6
    $normal.ParagraphFormat.LineSpacingRule = 5
    $normal.ParagraphFormat.LineSpacing = 15

    foreach ($styleName in @("Heading 1", "Heading 2", "Heading 3")) {
        $style = $doc.Styles.Item($styleName)
        $style.Font.Name = "Calibri"
        $style.Font.Bold = $true
        $style.Font.Color = 0xB5742E
        $style.ParagraphFormat.KeepWithNext = $true
    }
    $doc.Styles.Item("Heading 1").Font.Size = 16
    $doc.Styles.Item("Heading 2").Font.Size = 13
    $doc.Styles.Item("Heading 3").Font.Size = 12

    function Add-Para {
        param(
            [string]$Text,
            [string]$Style = "Normal",
            [switch]$Bold,
            [switch]$Italic,
            [switch]$Code,
            [switch]$PassThru,
            [int]$Align = 0
        )
        $p = $doc.Paragraphs.Add()
        $p.Range.Text = $Text
        $p.Range.Style = $doc.Styles.Item($Style)
        $p.Alignment = $Align
        if ($Bold) { $p.Range.Font.Bold = $true }
        if ($Italic) { $p.Range.Font.Italic = $true }
        if ($Code) {
            $p.Range.Font.Name = "Consolas"
            $p.Range.Font.Size = 9
            $p.Range.Shading.BackgroundPatternColor = 0xF3F3F3
            $p.LeftIndent = Inches 0.15
            $p.RightIndent = Inches 0.15
            $p.SpaceBefore = 3
            $p.SpaceAfter = 6
        }
        $p.Range.InsertParagraphAfter() | Out-Null
        if ($PassThru) { return $p }
    }

    function Add-Bullet {
        param([string]$Text)
        $p = Add-Para -Text $Text -PassThru
        $p.Range.ListFormat.ApplyBulletDefault() | Out-Null
        $p.LeftIndent = Inches 0.25
        $p.FirstLineIndent = -(Inches 0.12)
    }

    function Add-Number {
        param([string]$Text)
        $p = Add-Para -Text $Text -PassThru
        $p.Range.ListFormat.ApplyNumberDefault() | Out-Null
        $p.LeftIndent = Inches 0.25
        $p.FirstLineIndent = -(Inches 0.12)
    }

    function Add-MarkdownTable {
        param([string[]]$Rows)
        if ($Rows.Count -lt 2) { return }
        $parsed = @()
        foreach ($row in $Rows) {
            if ($row -match '^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$') { continue }
            $cells = $row.Trim().Trim('|').Split('|') | ForEach-Object { $_.Trim().Trim('`') }
            if ($cells.Count -gt 0) { $parsed += ,$cells }
        }
        if ($parsed.Count -eq 0) { return }
        $cols = ($parsed | ForEach-Object { $_.Count } | Measure-Object -Maximum).Maximum
        $table = $doc.Tables.Add($doc.Range($doc.Content.End - 1, $doc.Content.End - 1), $parsed.Count, $cols)
        $table.Borders.Enable = $true
        $table.AllowAutoFit = $false
        $table.Range.Font.Name = "Calibri"
        $table.Range.Font.Size = 9
        for ($r = 1; $r -le $parsed.Count; $r++) {
            for ($c = 1; $c -le $cols; $c++) {
                $value = if ($c -le $parsed[$r - 1].Count) { $parsed[$r - 1][$c - 1] } else { "" }
                $table.Cell($r, $c).Range.Text = $value
                $table.Cell($r, $c).TopPadding = 4
                $table.Cell($r, $c).BottomPadding = 4
                $table.Cell($r, $c).LeftPadding = 5
                $table.Cell($r, $c).RightPadding = 5
            }
        }
        for ($c = 1; $c -le $cols; $c++) {
            $table.Cell(1, $c).Range.Bold = $true
            $table.Cell(1, $c).Shading.BackgroundPatternColor = 0xF5E8E2
        }
        $table.PreferredWidthType = 2
        $table.PreferredWidth = 100
        Add-Para -Text ""
    }

    $inCode = $false
    $codeBuffer = New-Object System.Collections.Generic.List[string]
    $tableBuffer = New-Object System.Collections.Generic.List[string]

    function Flush-Table {
        if ($tableBuffer.Count -gt 0) {
            Add-MarkdownTable -Rows $tableBuffer.ToArray()
            $tableBuffer.Clear()
        }
    }

    function Flush-Code {
        if ($codeBuffer.Count -gt 0) {
            Add-Para -Text ($codeBuffer -join "`r`n") -Code
            $codeBuffer.Clear()
        }
    }

    foreach ($line in $markdown) {
        if ($line -match '^```') {
            if ($inCode) {
                Flush-Code
                $inCode = $false
            } else {
                Flush-Table
                $inCode = $true
            }
            continue
        }
        if ($inCode) {
            $codeBuffer.Add($line)
            continue
        }
        if ($line -match '^\s*\|.*\|\s*$') {
            $tableBuffer.Add($line)
            continue
        } else {
            Flush-Table
        }
        if ($line.Trim().Length -eq 0) { continue }
        if ($line -match '^# (.+)$') {
            $p = Add-Para -Text $Matches[1] -Style "Title" -PassThru
            $p.Range.Font.Name = "Calibri"
            $p.Range.Font.Size = 22
            $p.Range.Font.Bold = $true
            $p.Range.Font.Color = 0xA800F0
            continue
        }
        if ($line -match '^## (.+)$') {
            Add-Para -Text $Matches[1] -Style "Heading 1"
            continue
        }
        if ($line -match '^### (.+)$') {
            Add-Para -Text $Matches[1] -Style "Heading 2"
            continue
        }
        if ($line -match '^- (.+)$') {
            Add-Bullet -Text ($Matches[1] -replace '`', '')
            continue
        }
        if ($line -match '^\d+\. (.+)$') {
            Add-Number -Text ($Matches[1] -replace '`', '')
            continue
        }
        if ($line -match '^> ?(.+)$') {
            $p = Add-Para -Text $Matches[1] -Italic -PassThru
            $p.LeftIndent = Inches 0.25
            $p.Range.Shading.BackgroundPatternColor = 0xFAF0F6
            continue
        }
        Add-Para -Text ($line -replace '`', '')
    }
    Flush-Table
    Flush-Code

    Add-Para -Text "Embedded Sample Layout Screens" -Style "Heading 1"
    $screens = @(
        @{ Caption = "1. Login screen"; Path = "handoff\assets\01-login.jpg" },
        @{ Caption = "2. Elite Circle conversations"; Path = "handoff\assets\02-elite.jpg" },
        @{ Caption = "3. Template Vault"; Path = "handoff\assets\03-vault.jpg" },
        @{ Caption = "4. Coaching Engine"; Path = "handoff\assets\04-coach.jpg" },
        @{ Caption = "5. Home center snapshot"; Path = "handoff\assets\05-home.jpg" }
    )
    foreach ($screen in $screens) {
        Add-Para -Text $screen.Caption -Style "Heading 2"
        $p = $doc.Paragraphs.Add()
        $p.Alignment = 1
        $shape = $p.Range.InlineShapes.AddPicture((Resolve-Path -LiteralPath $screen.Path).Path)
        $shape.LockAspectRatio = $true
        $shape.Width = 230
        $p.Range.InsertParagraphAfter() | Out-Null
    }

    try {
        $doc.BuiltInDocumentProperties.Item("Title").Value = "Prima Donna AI Android App Handoff"
        $doc.BuiltInDocumentProperties.Item("Subject").Value = "Native Android app handoff with functions and layout instructions"
        $doc.BuiltInDocumentProperties.Item("Author").Value = "Codex"
    } catch {
        Write-Verbose "Word document properties were not writable in this environment."
    }

    $doc.SaveAs2((Resolve-Path -LiteralPath (Split-Path -Parent $OutputDocx)).Path + "\" + (Split-Path -Leaf $OutputDocx), 16)
    $doc.ExportAsFixedFormat((Resolve-Path -LiteralPath (Split-Path -Parent $OutputPdf)).Path + "\" + (Split-Path -Leaf $OutputPdf), 17)
}
finally {
    if ($doc) { $doc.Close($false) | Out-Null }
    $word.Quit() | Out-Null
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}

Write-Host "Wrote $OutputDocx"
Write-Host "Wrote $OutputPdf"
