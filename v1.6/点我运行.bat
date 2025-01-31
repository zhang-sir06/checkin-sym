@echo off
chcp 65001 >nul  &rem
cd /d "%~dp0"
start "Node Server" node server-lite.js
echo 正在等待服务启动...

:port_check
set "max_retry=30"  &rem 最大重试次数（约30秒）
set "retry_count=0"

:check_loop
timeout /t 1 >nul  &rem 每秒检测一次
netstat -an | find "LISTENING" | find ":3000" >nul
if %errorlevel% equ 0 (
    echo 服务已就绪！
    start http://localhost:3000
    exit
) else (
    set /a "retry_count+=1"
    if %retry_count% geq %max_retry% (
        echo 等待超时，请手动访问 http://localhost:3000
        pause
        exit /b 1
    )
    goto check_loop
)