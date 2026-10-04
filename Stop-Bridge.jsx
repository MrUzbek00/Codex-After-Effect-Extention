// Stops polling. It cannot interrupt an executing ExtendScript operation.
(function () {
    var state = $.global.__codexAEBridge;
    if (!state) return;
    if (state.task !== null) app.cancelTask(state.task);
    if (state.root) {
        var heartbeat = new File(state.root + '/local/heartbeat.txt');
        if (heartbeat.exists) heartbeat.remove();
    }
    $.global.__codexAEBridge = null;
}());
