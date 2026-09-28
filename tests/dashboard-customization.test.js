import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DEFAULT_DASHBOARD_ORDER,normalizeDashboardPreferences,moveDashboardWidget,setDashboardWidgetVisible,setDashboardColumns,resetDashboardPreferences} from '../src/dashboard-preferences.js';

test('dashboard preferences start with all Mi día widgets visible in a stable order',()=>{
 const prefs=normalizeDashboardPreferences();
 assert.deepEqual(prefs.order,DEFAULT_DASHBOARD_ORDER);
 assert.deepEqual(prefs.hidden,[]);
 assert.equal(prefs.columns,'auto');
});

test('dashboard preferences preserve valid custom order and repair stale values',()=>{
 const prefs=normalizeDashboardPreferences({order:['reading','reading','unknown','hero'],hidden:['water','unknown','water'],columns:'two'});
 assert.deepEqual(prefs.order.slice(0,2),['reading','hero']);
 assert.equal(new Set(prefs.order).size,DEFAULT_DASHBOARD_ORDER.length);
 assert.deepEqual(prefs.hidden,['water']);
 assert.equal(prefs.columns,'two');
});

test('widgets can be reordered, hidden, shown and reset without losing any widget',()=>{
 let prefs=normalizeDashboardPreferences();
 prefs=moveDashboardWidget(prefs,'agenda',-1);
 assert.equal(prefs.order.indexOf('agenda'),DEFAULT_DASHBOARD_ORDER.indexOf('agenda')-1);
 prefs=setDashboardWidgetVisible(prefs,'nutrition',false);
 assert.ok(prefs.hidden.includes('nutrition'));
 prefs=setDashboardWidgetVisible(prefs,'nutrition',true);
 assert.ok(!prefs.hidden.includes('nutrition'));
 prefs=setDashboardColumns(prefs,'one');
 assert.equal(prefs.columns,'one');
 assert.deepEqual(resetDashboardPreferences().order,DEFAULT_DASHBOARD_ORDER);
});

test('Mi día loads the dashboard customizer as part of the native UI',()=>{
 const nativeUi=fs.readFileSync(new URL('../src/native-ui.js',import.meta.url),'utf8');
 const integration=fs.readFileSync(new URL('../src/dashboard-customization.js',import.meta.url),'utf8');
 assert.match(nativeUi,/import '\.\/dashboard-customization\.js';/);
 assert.match(integration,/dashboardWidgets/);
 assert.match(integration,/MutationObserver/);
 assert.match(integration,/Personalizar widgets de Mi día/);
 assert.match(integration,/data-dashboard-widget-toggle/);
});
