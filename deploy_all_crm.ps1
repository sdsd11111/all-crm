$ErrorActionPreference = 'Continue'

# Clave SSH segura para este VPS
$keyDst = "$PSScriptRoot\vps-entrada\agenda_vps_nueva"
$vpsHost = "root@178.238.238.158"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "       Desplegando ALL-CRM al VPS         " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Clonar o actualizar el repositorio en el VPS
Write-Host "`n[1/3] Sincronizando repositorio en el VPS..." -ForegroundColor Yellow
$remoteGitCmd = @'
if [ ! -d "/root/all-crm/.git" ]; then
    echo "Carpeta no inicializada como git. Limpiando y clonando de nuevo..."
    rm -rf /root/all-crm
    git clone git@github-all-crm:sdsd11111/all-crm.git /root/all-crm
fi

cd /root/all-crm
echo "Sincronizando con rama main..."
git stash
git pull origin main
'@

& ssh -i $keyDst -o StrictHostKeyChecking=no $vpsHost $remoteGitCmd

# 2. Asegurar archivo .env.local en el VPS
Write-Host "`n[2/3] Sincronizando .env.local al VPS..." -ForegroundColor Yellow
& scp -i $keyDst -o StrictHostKeyChecking=no "$PSScriptRoot\.env.local" "${vpsHost}:/root/all-crm/.env.local"

# 3. Levantar Docker
Write-Host "`n[3/3] Reconstruyendo contenedor Docker all-crm-app..." -ForegroundColor Yellow
$dockerCmd = @'
cd /root/all-crm
docker compose up -d --build
echo ""
echo "Estado del contenedor:"
docker ps --filter "name=all-crm-app"
'@

& ssh -i $keyDst -o StrictHostKeyChecking=no $vpsHost $dockerCmd

Write-Host "`nDespliegue completado con éxito en el puerto 3008." -ForegroundColor Green
Write-Host "Puedes verificar en: http://178.238.238.158:3008" -ForegroundColor Green

