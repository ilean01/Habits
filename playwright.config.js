import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
 testDir:'./e2e',
 fullyParallel:false,
 retries:1,
 reporter:'line',
 use:{baseURL:'http://127.0.0.1:4174',trace:'retain-on-failure'},
 webServer:{command:'npm run dev -- --port 4174',url:'http://127.0.0.1:4174',reuseExistingServer:false,timeout:120000},
 projects:[
  {name:'notebook',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:900}}},
  {name:'mobile',use:{...devices['iPhone 16 Pro'],browserName:'chromium'}}
 ]
});
