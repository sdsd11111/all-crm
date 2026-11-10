$ErrorActionPreference = 'Continue'

# Clave SSH segura para este VPS
$keyDst = "$PSScriptRoot\vps-entrada\agenda_vps_nueva"
$vpsHost = "root@178.238.238.158"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "       Desplegando ALL-CRM al VPS         " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Asegurar archivo .env.local en el VPS
Write-Host "`n[1/3] Sincronizando .env.local al VPS..." -ForegroundColor Yellow
& ssh -i $keyDst -o StrictHostKeyChecking=no $vpsHost "mkdir -p /root/all-crm"
& scp -i $keyDst -o StrictHostKeyChecking=no "$PSScriptRoot\.env.local" "${vpsHost}:/root/all-crm/.env.local"

# 2. Comandos remotos en el VPS
Write-Host "`n[2/3] Actualizando repositorio y levantando Docker..." -ForegroundColor Yellow
$remoteCmd = @'
if [ ! -d "/root/all-crm/.git" ]; then
    echo "Clonando repositorio all-crm por primera vez con deploy key..."
    git clone git@github-all-crm:sdsd11111/all-crm.git /root/all-crm
fi

cd /root/all-crm
echo "Sincronizando con rama main..."
git stash
git pull origin main

echo "Reconstruyendo contenedor Docker all-crm-app..."
docker compose up -d --build

echo "Estado del contenedor:"
docker ps --filter "name=all-crm-app"
'@

& ssh -i $keyDst -o StrictHostKeyChecking=no $vpsHost $remoteCmd

Write-Host "`n[3/3] Despliegue completado con éxito en el puerto 3008." -ForegroundColor Green
Write-Host "Puedes verificar en: http://178.238.238.158:3008" -ForegroundColor Green

