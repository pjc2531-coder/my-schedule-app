# my-schedule-app

Vercel frontend + Vercel serverless API + Google Apps Script + Google Sheets.

## Files
- `index.html`: schedule entry UI
- `api/schedule.js`: server-side proxy to Google Apps Script
- `gas/Code.gs`: Apps Script code to paste into the spreadsheet-bound Apps Script project
- `vercel.json`: Vercel configuration

## Required Vercel environment variables
- `GAS_WEB_APP_URL`: deployed Google Apps Script Web App URL ending in `/exec`
- `GAS_API_KEY`: same secret value as Apps Script Script Property `SCHEDULE_API_KEY`

Never commit the API key to GitHub.

## Google Apps Script setup
1. Paste `gas/Code.gs` into the spreadsheet-bound Apps Script project.
2. In Project Settings > Script Properties, add `SCHEDULE_API_KEY` with a long random value.
3. Deploy > Manage deployments > Edit the Web App deployment, create a new version, and set access so the Vercel server can call it.
4. Set the two Vercel environment variables above, then redeploy.

The spreadsheet tab must be named `일정관리` and row 1 must be:
`구분 | 날짜 | 시작 | 종료 | 내용 | 완료 | 메모`
