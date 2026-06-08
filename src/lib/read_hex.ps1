$path = "../components/admin/MailManagement.tsx"
$content = Get-Content -Path $path -Raw
$index = $content.IndexOf("try {")
if ($index -ge 0) {
    $snippet = $content.Substring($index, 200)
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($snippet)
    $hex = $bytes | ForEach-Object { "{0:X2}" -f $_ }
    $hex -join " "
}
