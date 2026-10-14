(function () {
    'use strict';
    // Standalone Vendetta-compatible bundle for Kettu.
    const api = vendetta;
    const targets = ['useIsMobileQuestDockRendered', 'useIsMobileQuestDockRenderedBase'];
    const cleanups = [];
    const patched = new Set();
    let timer;
    let active = false;
    let attempts = 0;

    function scan() {
        for (const name of targets) {
            if (patched.has(name)) continue;
            try {
                const mod = api.metro.findByProps(name);
                if (!mod || typeof mod[name] !== 'function') continue;
                // Keep the original hook call so React's hook order stays intact.
                const undo = api.patcher.after(name, mod, function () { return false; });
                cleanups.push(undo);
                patched.add(name);
            } catch (error) {
                console.warn('[Hide Quest Popups] Could not patch ' + name, error);
            }
        }
        attempts++;
        if (patched.size === targets.length || attempts >= 60) {
            clearInterval(timer);
            timer = undefined;
            if (!patched.size) console.warn('[Hide Quest Popups] Quest dock hooks were not found. This Discord build may require an updated plugin.');
        }
    }

    function unload() {
        active = false;
        clearInterval(timer);
        timer = undefined;
        while (cleanups.length) {
            try { cleanups.pop()(); } catch (error) { console.warn('[Hide Quest Popups] Cleanup failed', error); }
        }
        patched.clear();
        attempts = 0;
    }

    function Settings() {
        const React = api.metro.common.React;
        const RN = api.metro.common.ReactNative;
        const state = React.useState(0);
        React.useEffect(function () {
            const refresh = setInterval(function () { state[1](function (v) { return v + 1; }); }, 1000);
            return function () { clearInterval(refresh); };
        }, []);
        const status = patched.size ? 'Visibility hooks patched: ' + patched.size + '/' + targets.length
            : timer ? 'Waiting for Discord to load the quest dock…'
            : 'No matching hooks found. Compatibility update needed.';
        return React.createElement(RN.ScrollView, { style: { flex: 1 }, contentContainerStyle: { padding: 20 } },
            React.createElement(RN.Text, { style: { color: '#ffffff', fontSize: 20, marginBottom: 16 } }, 'Hide Quest Popups'),
            React.createElement(RN.Text, { style: { color: '#bbbbbb', marginBottom: 16 } }, status),
            React.createElement(RN.Text, { style: { color: '#bbbbbb' } }, 'Hides the mobile quest dock above your user panel. Restart Discord after enabling or disabling. This does not change your quest account settings.'));
    }

    return {
        onLoad: function () {
            if (active) return;
            active = true;
            attempts = 0;
            scan();
            if (patched.size !== targets.length) timer = setInterval(scan, 1000);
        },
        onUnload: unload,
        settings: Settings
    };
})();
