$headers = @{
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4dXhibXJrb2ZsemJtcGVna3llIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI2MTUxOSwiZXhwIjoyMDg2ODM3NTE5fQ.vlfZ5al4jqyKIEO3ywaYY47N-zuMd_ehR-Ap0_PKQWI"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4dXhibXJrb2ZsemJtcGVna3llIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI2MTUxOSwiZXhwIjoyMDg2ODM3NTE5fQ.vlfZ5al4jqyKIEO3ywaYY47N-zuMd_ehR-Ap0_PKQWI"
    "Content-Type" = "application/json"
}
$body = @{ station_id = 3 } | ConvertTo-Json
Invoke-RestMethod -Uri "https://dxuxbmrkoflzbmpegkye.supabase.co/rest/v1/fields?field_id=eq.9" -Method Patch -Headers $headers -Body $body
write-host "Update complete"
