param(
    [string]$ProjectRef = "owjhaoiqiujpdndcwccl",
    [string]$FromEmail = $env:SMTP_FROM_EMAIL,
    [string]$SenderName = $(if ($env:SMTP_SENDER_NAME) { $env:SMTP_SENDER_NAME } else { "The Preschool Prima Donna AI" }),
    [string]$SupabaseAccessToken = $env:SUPABASE_ACCESS_TOKEN,
    [string]$ResendApiKey = $env:RESEND_API_KEY
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($SupabaseAccessToken)) {
    throw "Set SUPABASE_ACCESS_TOKEN to a Supabase personal access token from https://supabase.com/dashboard/account/tokens."
}

if ([string]::IsNullOrWhiteSpace($ResendApiKey)) {
    throw "Set RESEND_API_KEY to the Resend API key. Do not commit it or paste it into chat."
}

if ([string]::IsNullOrWhiteSpace($FromEmail)) {
    throw "Set SMTP_FROM_EMAIL to a verified sender address on your Resend domain, for example no-reply@auth.example.com."
}

$body = @{
    external_email_enabled = $true
    mailer_secure_email_change_enabled = $true
    mailer_autoconfirm = $false
    smtp_admin_email = $FromEmail
    smtp_host = "smtp.resend.com"
    smtp_port = 465
    smtp_user = "resend"
    smtp_pass = $ResendApiKey
    smtp_sender_name = $SenderName
} | ConvertTo-Json

$headers = @{
    Authorization = "Bearer $SupabaseAccessToken"
    "Content-Type" = "application/json"
}

$url = "https://api.supabase.com/v1/projects/$ProjectRef/config/auth"

Write-Host "Configuring Supabase Auth custom SMTP for project $ProjectRef..."
Write-Host "Sender: $SenderName <$FromEmail>"

Invoke-RestMethod -Method Patch -Uri $url -Headers $headers -Body $body | Out-Null

Write-Host "Custom SMTP configuration submitted."
Write-Host "Next: send one password-reset test email to a real mailbox and confirm it arrives from the Resend sender."
