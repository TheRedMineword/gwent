const statusEl =
    document.getElementById('status');

const detailsEl =
    document.getElementById('details');

const progressEl =
    document.getElementById('bar');

window.updater.onStatus(text => {

    statusEl.innerText = text;
});

window.updater.onProgress(data => {

    const percent =
        Math.floor(
            (data.current / data.total) * 100
        );

    statusEl.innerText =
        'Downloading update...';

    detailsEl.innerText =
        `${data.current}/${data.total} : ${data.file}`;

    progressEl.value = percent;
});