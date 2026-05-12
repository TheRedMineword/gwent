const {
    contextBridge,
    ipcRenderer
} = require('electron');

contextBridge.exposeInMainWorld('updater', {

    onProgress: callback => {
        ipcRenderer.on(
            'update-progress',
            (_, data) => callback(data)
        );
    },

    onStatus: callback => {
        ipcRenderer.on(
            'update-status',
            (_, data) => callback(data)
        );
    }
});