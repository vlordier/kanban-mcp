#!/usr/bin/env node
// Simple script to trigger the kanban board in VSCode via command line

const { exec } = require('child_process');

// Use VSCode CLI to execute the command
exec('code --command workbench.action.tasks.runTask', (error, stdout, stderr) => {
    if (error) {
        console.error(`Error: ${error}`);
        return;
    }
    console.log('Triggered VSCode command');
});

// Alternative approach: use AppleScript on macOS
const osascript = `
tell application "Visual Studio Code"
    activate
    delay 1
end tell

tell application "System Events"
    keystroke "p" using {command down, shift down}
    delay 0.5
    type text "Kanban MCP: Show Kanban Board"
    delay 0.5
    key code 36
end tell
`;

require('child_process').exec(`osascript -e '${osascript}'`, (error, stdout, stderr) => {
    if (error) {
        console.error(`AppleScript error: ${error}`);
        return;
    }
    console.log('Executed AppleScript to trigger Kanban board');
});