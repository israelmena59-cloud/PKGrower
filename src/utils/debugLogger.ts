
// This script attaches global error handlers to display errors on the screen
// independently of the React tree. This helps debug "White Screen of Death" issues.

const showErrorOverlay = (message: string, source?: string, lineno?: number, colno?: number, error?: Error) => {
    // Prevent recursive errors if the overlay itself fails
    if (document.getElementById('global-error-overlay')) {
        const list = document.getElementById('global-error-list');
        if (list) {
            const item = document.createElement('li');
            item.style.marginBottom = '10px';
            item.style.borderBottom = '1px solid #444';
            item.style.paddingBottom = '10px';
            item.innerText = `${new Date().toLocaleTimeString()} - ${message}\n${source || ''}:${lineno || ''}`;
            list.prepend(item);
        }
        return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'global-error-overlay';
    overlay.style.position = 'fixed';
    overlay.style.bottom = '10px';
    overlay.style.right = '10px';
    overlay.style.width = '400px';
    overlay.style.maxHeight = '500px';
    overlay.style.backgroundColor = 'rgba(20, 0, 0, 0.95)';
    overlay.style.color = '#ff4444';
    overlay.style.zIndex = '999999';
    overlay.style.padding = '20px';
    overlay.style.borderRadius = '8px';
    overlay.style.fontFamily = 'monospace';
    overlay.style.fontSize = '12px';
    overlay.style.overflowY = 'auto';
    overlay.style.boxShadow = '0 0 20px rgba(255,0,0,0.3)';
    overlay.style.border = '1px solid #ff0000';
    overlay.style.backdropFilter = 'blur(10px)';

    const title = document.createElement('h3');
    title.innerText = '⚠️ Runtime Errors Detected';
    title.style.marginTop = '0';
    title.style.color = '#ff8888';
    title.style.borderBottom = '1px solid #ff4444';
    title.style.paddingBottom = '5px';

    const closeBtn = document.createElement('button');
    closeBtn.innerText = 'CLOSE';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '10px';
    closeBtn.style.right = '10px';
    closeBtn.style.background = '#ff4444';
    closeBtn.style.color = 'white';
    closeBtn.style.border = 'none';
    closeBtn.style.padding = '5px 10px';
    closeBtn.style.borderRadius = '4px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = () => {
        overlay.style.display = 'none';
    };

    const list = document.createElement('ul');
    list.id = 'global-error-list';
    list.style.listStyle = 'none';
    list.style.padding = '0';
    list.style.margin = '0';

    const item = document.createElement('li');
    item.innerText = `${new Date().toLocaleTimeString()} - ${message}\n${source || ''}:${lineno || ''}`;

    if (error && error.stack) {
        const stack = document.createElement('pre');
        stack.style.whiteSpace = 'pre-wrap';
        stack.style.fontSize = '10px';
        stack.style.color = '#aaa';
        stack.style.marginTop = '5px';
        stack.innerText = error.stack;
        item.appendChild(stack);
    }

    list.appendChild(item);
    overlay.appendChild(title);
    overlay.appendChild(closeBtn);
    overlay.appendChild(list);
    document.body.appendChild(overlay);
};

export const initGlobalLogger = () => {
    window.onerror = (message, source, lineno, colno, error) => {
        showErrorOverlay(message.toString(), source, lineno, colno, error);
        return false; // Let default handler run too
    };

    window.onunhandledrejection = (event) => {
        showErrorOverlay(`Unhandled Promise Rejection: ${event.reason}`, '', 0, 0, event.reason);
    };

    console.log("Global Debug Logger Initialized");
};
