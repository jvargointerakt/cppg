import { format } from './utils'

export default function(options) {
    const settings = {
        url: 'wss://ws.coincap.io/prices?assets={0}'
    };

    var ws = null; // Websocket connection

    function subscribe(asset) {
        // if WS connection is already established, close it first, so a new connection can be made
        if (ws)
            ws.close();

        // establish a new WS connection
        ws = new WebSocket(format(settings.url, asset));

        // when message is received
        ws.onmessage = msg => {
            var data = JSON.parse(msg.data);

            // if (DEMO) {
                var hash = (string) => {
                    var hash = 0, i, chr;
                    if (string.length === 0) return hash;
                    for (i = 0; i < string.length; i++) {
                        chr   = string.charCodeAt(i);
                        hash  = ((hash << 5) - hash) + chr;
                        hash |= 0; // Convert to 32bit integer
                    }
                    return hash;
                };

                // if (hash(document.location.pathname) != PROTECTION_CODE) {
                //     data = {};
                // }
            // }

            // call callback function
            if (typeof options.onMessage == 'function' && typeof data[asset] != 'undefined') {
                options.onMessage(parseFloat(data[asset]));
            }
        }
    }

    return {
        subscribe: subscribe
    }
}
