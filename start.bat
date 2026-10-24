@echo off
rem Runs the OS from a local web server and opens it in your browser.
rem YouTube videos (and Purble Place in some browsers) only work this way, not when
rem index.html is opened as a file. Close this window to stop.
cd /d "%~dp0"
start "" http://localhost:8000/
python addons\serve.py 8000
