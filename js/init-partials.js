// init-partials.js
// Ensure tab partials are loaded before running tab-related initializers
(function(){
    'use strict';
    function onPartialsLoaded(){
        try{ if (typeof cacheDOMRefs === 'function') cacheDOMRefs(); } catch(e){}
        try{ if (typeof updateTable === 'function') updateTable(); } catch(e){}
        try{ if (typeof renderInfoTab === 'function') renderInfoTab(); } catch(e){}
        try{ if (typeof renderAlertsList === 'function') renderAlertsList(); } catch(e){}
        // Trigger heavy tab renders once so UI is populated
        try{
            if (typeof maybeRenderHeavyTab === 'function'){
                if (typeof renderSignalLab === 'function') maybeRenderHeavyTab('signalLab', renderSignalLab, { interval: 1500 });
                if (typeof renderBacktestTab === 'function') maybeRenderHeavyTab('backtest', renderBacktestTab, { interval: 6000 });
                if (typeof renderRiskMonitorTab === 'function') maybeRenderHeavyTab('risk', renderRiskMonitorTab, { interval: 3000 });
                if (typeof renderEventWatchTab === 'function') maybeRenderHeavyTab('events', renderEventWatchTab, { interval: 2500, requireActive: false });
            }
        } catch(e){}
    }

    if (window.PARTIALS) {
        // already loaded
        setTimeout(onPartialsLoaded, 0);
    } else {
        document.addEventListener('partialsLoaded', function() {
            onPartialsLoaded();
        }, { once: true });
    }
})();
