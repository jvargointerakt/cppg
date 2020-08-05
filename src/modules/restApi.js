import axios from 'axios'
import { format } from './utils'

export default function(options) {
    const settings = {
        url: 'https://api.coincap.io/v2/assets/{0}/history?interval={1}&start={2}&end={3}'
    };

    /**
     * Get historical data
     *
     * @param asset - bitcoin, ethereum etc
     * @param interval - m1, m5, m15, m30, h1, h2, h6, h12, d1
     * @param depth - in minutes
     * @param limit - how many records to return
     */
    function getHistory(asset, interval, depth = 10, limit = 10) {
        var end = new Date().getTime();
        var start = end - depth * 60 * 1000;

        axios.get(format(settings.url, asset, interval, start, end)).then(response => {
            if (response.status == 200 && typeof response.data.data != 'undefined' && typeof options.onHistory == 'function') {
                var data = response.data.data;

                data = data.slice(Math.max(data.length - limit, 0)).map(item => {
                    return {
                        date: item.time,
                        price: parseFloat(item.priceUsd)
                    }
                });

                options.onHistory(data);
            }
        });
    }

    return {
        getHistory: getHistory
    }
}