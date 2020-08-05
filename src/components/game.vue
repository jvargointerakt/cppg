<template>
    <div :class="[config.code + '-container', $attrs.display == 'stacked' ? config.code + '-stacked' : '']">
        <div class="header-container">
          <div :class="config.code + '-dropdowns'">
            <div class="dropdown-item">
              <label>{{ __('Asset') }}</label>
              <vue-select v-model="asset" :options="assets" label="name" :clearable="false" @change="updateAsset" :disabled="tradeIsOpen"></vue-select>
            </div>
            <div class="dropdown-item">
              <label>{{ __('Duration') }}</label>
              <vue-select v-model="expiry" :options="expirations" :clearable="false" :value="expiry" :disabled="tradeIsOpen"></vue-select>
            </div>
          </div>
        </div>
        <div class="body-container">
          <div class="chart-container">
            <canvas class="chart-canvas" ref="chart"></canvas>
            <p class="current-price-label" :style="`top: ${currentPricePosY}px;`">Hello</p>
          </div>
          <div :class="config.code + '-panel-container'" style="position: relative">
            <div :class="config.code + '-inputs'">
              <div class="inputs-grid">
                <label class="inputs-title">Stake</label>
                <input class="inputs-input" type="number" v-model="stake" :disabled="tradeIsOpen">
                <button class="input-plus-minus" @click="decrementStake">-</button>
                <button class="input-plus-minus" @click="incrementStake">+</button>
                <label class="inputs-title">Payout: {{ _payout }}</label>
              </div>
            </div>
            <div :class="config.code + '-price-container'">
              <div>
                <span :class="config.code + '-symbol'">{{ this.asset.symbol }}</span>
                <sup>$</sup>
              </div>
              <div>
                <span>{{ _lastPriceIntegerPart }}</span>
                <sup>{{ _lastPriceDecimalPart }}</sup>
              </div>
            </div>
            <div :class="config.code + '-trade-buttons'">
              <button @click="trade(1)" :disabled="tradeIsOpen || !canTrade" :class="config.code + '-high'">{{ __('High') }}</button>
              <button @click="trade(-1)" :disabled="tradeIsOpen || !canTrade" :class="config.code + '-low'">{{ __('Low') }}</button>
            </div>
            <div v-show="message" :class="config.code + '-message'">
              {{ message }}
            </div>
            <div v-show="secondsToExpiry > 0" :class="config.code + '-progress-bar'">
              <div :style="{ width: secondsToExpiry / duration * 100 + '%' }"></div>
            </div>
            <div :class="config.code + '-stats'">
              <div>
                <span>{{ __('Balance') }}</span>
                <span>{{ _balance }}</span>
              </div>
              <div>
                <span>{{ __('Wins') }}</span>
                <span>{{ userData.wins }}</span>
              </div>
              <div>
                <span>{{ __('Losses') }}</span>
                <span>{{ userData.losses }}</span>
              </div>
            </div>
          </div>
        </div>
    </div>
</template>

<script type="text/babel">
    // import styles from '../../../scss/style.scss'
    import assets from '../static/assets.json'
    import * as nf from '../modules/numberFormat'
    import * as cf from '../modules/colorFormat'
    import Chart from 'chart.js'
    import RestApi from '../modules/restApi'
    import WsApi from '../modules/websocketApi'
    import 'vue-select/dist/vue-select.css';

    export default {
        mixins: [],
        data() {
            return {
                color: '#166fff',
                asset: null,
                expiry: null,
                secondsToExpiry: 0,
                stake: 10,
                return: this.$attrs.return ? parseFloat(this.$attrs.return) : 0.8,
                quotes: [],
                chart: null,
                restApi: null,
                wsApi: null,
                message: null,
                defaultUserData: {
                    balance: 1000,
                    wins: 0,
                    losses: 0,
                    trade: null
                },
                userData: null,
                timeout: null,
                interval: null,
                currentPricePosY: 0
            }
        },
        computed: {
            config() {
                return this.$parent.config;
            },
            assets() {
                return assets;
            },
            expirations() {
                return [
                    { value:5, label: this.__('5 seconds') },
                    { value:15, label: this.__('15 seconds') },
                    { value:30, label: this.__('30 seconds') },
                    { value:45, label: this.__('45 seconds') },
                    { value:60, label: this.__('1 minute') },
                    { value:120, label: this.__('2 minutes') },
                    { value:300, label: this.__('5 minutes') },
                    { value:600, label: this.__('10 minutes') },
                    { value:900, label: this.__('15 minutes') },
                    { value:1800, label: this.__('30 minutes') },
                    { value:3600, label: this.__('1 hour') }
                ];
            },
            dates() {
                return this.quotes.map(quote => quote.date);
            },
            prices() {
                return this.quotes.map(quote => quote.price);
            },
            balance() {
                return this.userData.balance;
            },
            _balance() {
                return '$' + nf.decimal(this.balance);
            },
            _payout() {
                return this.stake > 0 ? '$' + nf.decimal(this.stake * (1 + this.return)) + ' (' + nf.percentage(this.return * 100) + ')' : '';
            },
            lastPrice() {
                var n = this.quotes.length;
                return n > 0 ? this.quotes[this.quotes.length-1].price : 0;
            },
            _lastPrice() {
                return nf.variableDecimal(this.lastPrice);
            },
            duration() {
                return this.userData.trade ? this.userData.trade.expiry - this.userData.trade.date : 0;
            },
            _lastPriceIntegerPart() {
                return nf.integer(Math.floor(this.lastPrice));
            },
            _lastPriceDecimalPart() {
                var string = this.lastPrice + '';
                var n = string.indexOf('.');
                return n > -1 ? string.substring(n + 1, n + 9) : '';
            },
            tradeIsOpen() {
                return this.userData.trade !== null;
            },
            canTrade() {
                return !this.tradeIsOpen && this.stake >= 0 && this.userData.balance >= this.stake && this.lastPrice > 0;
            }
        },
        methods: {
            // display chart
            displayChart() {
                // if the chart is already initialized update the chart data
                if (this.chart !== null) {
                    this.chart.config.data.labels = this.dates;
                    this.chart.config.data.datasets[0].data = this.prices;
                    this.chart.update();
                    this.updateUI();
                    return;
                }

                var chartData = {
                    labels: this.dates,
                    datasets: [
                      {
                        data: this.prices,
                        borderColor: this.color,
                        borderWidth: 1,
                        backgroundColor: cf.gradient(this.$refs.chart, 'top to bottom', 300, [
                            cf.shadeBlend(0.1, this.color),
                            cf.shadeBlend(0.4, this.color),
                            cf.shadeBlend(0.7, this.color),
                            cf.shadeBlend(0.9, this.color)
                        ]),
                        radius: 0,
                        hoverRadius: 5,
                        hitRadius: 0,
                        pointRadius: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5]
                      }
                    ]
                };

                var chartOptions = {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                      padding: {
                        right: 100,
                        bottom: 20
                      }
                    },
                    hover: {
                      mode: 'nearest'
                    },
                    tooltips: {
                        enabled: true,
                        mode: 'index',
                        intersect: false, // display tooltip at all times
                        cornerRadius: 3,
                        titleFontColor: this.color,
                        bodyFontSize: 14,
                        displayColors: false,
                        bodyFontColor: this.color,
                        backgroundColor: '#fff',
                        borderColor: this.color,
                        borderWidth: 1,
                        xPadding: 10,
                        yPadding: 10,
                        bodySpacing: 5,
                        callbacks: {
                            label: (tooltipItem, data) => {
                                return this.asset.name + ' $' + nf.variableDecimal(tooltipItem.yLabel);
                            }
                        }
                    },
                    elements: {
                      line: {
                        tension: 0.5
                      },
                      point: {
                        radius: 3
                      }
                    },
                    legend: {
                        display: false
                    },
                    animation: {
                      duration: 400,
                      easing: 'easeInOutSine'
                    },
                    scales: {
                        xAxes: [{
                            display: true,
                            ticks: {
                                maxRotation: 0,
                                padding: 5,
                                callback: (value, index, values) => {
                                  if ((index + 1) % 5 === 0) {
                                    return new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                  }
                                  else return;
                                }
                            },
                            gridLines: {
                                display: false,
                                drawBorder: false
                            }
                        }],
                        yAxes: [{
                            display: true,
                            ticks: {
                                callback: (value, index, values) => '$' + nf.variableDecimal(value)
                            },
                            gridLines: {
                                display: false,
                                drawBorder: false
                            }
                        }]
                    }
                };

                this.chart = new Chart(this.$refs.chart, {
                    type: 'line',
                    data: chartData,
                    options: chartOptions
                });


            },
            // update chart and live data when asset is changed
            updateAsset() {
                this.quotes = [];
                this.restApi.getHistory(this.asset.id, 'm1', this.config.historyLength, this.config.historyLength);
                this.wsApi.subscribe(this.asset.id);
            },
            // make a new trade
            trade(direction) {
                var now = Math.round(new Date().getTime() / 1000);
                var expiry = parseInt(this.expiry.value);

                this.userData.balance -= this.stake; // decrease user balance

                this.userData.trade = {
                    date:       now,
                    expiry:     now + expiry,
                    direction:  direction,
                    stake:      this.stake,
                    price:      this.lastPrice
                };

                clearTimeout(this.timeout); // if trade is started before win / lose message disappears

                this.secondsToExpiry = this.expiry.value;

                this.setCheckTradeExpiryInterval();
                this.saveUserData();
            },
            // set interval for checking trade expiry
            setCheckTradeExpiryInterval() {
                this.message = this.__('Open price') + ': $' + this.userData.trade.price;
                // check trade for expiration every second
                this.interval = setInterval(() => this.checkTradeExpiry(), 1000);
            },
            // check if trade is expired
            checkTradeExpiry() {
                var trade = this.userData.trade;
                this.secondsToExpiry = trade.expiry - Math.round(new Date().getTime() / 1000);

                // trade is expired
                if (this.secondsToExpiry <= 0) {
                    clearInterval(this.interval);

                    var priceDifference = (this.lastPrice - trade.price) * trade.direction;

                    if (priceDifference > 0) {
                        var payout = trade.stake * (1 + this.return);
                        this.message = this.__('You win') + ' $' + nf.decimal(payout);
                        this.userData.balance += payout;
                        this.userData.wins++;
                    } else {
                        this.message = this.__('You lose');
                        this.userData.losses++;
                    }

                    // clear the message in 5 seconds
                    this.timeout = setTimeout(() => {
                        this.message = null;
                    }, 5000);

                    this.userData.trade = null;

                    this.saveUserData();
                }
            },
            // save user data to browser localStorage
            saveUserData() {
                localStorage.setItem(this.config.code, JSON.stringify(this.userData));
            },
            // translate string
            __(string) {
                return this.config.text[string] || string;
            },
            updateUI() {
              // console.log("updated", this.prices[this.prices.length - 1]);
              let lastPointPosition = this.chart.getDatasetMeta(0).data[this.quotes.length - 1];
              if (!lastPointPosition) return;
              this.currentPricePosY = lastPointPosition._view.y;
              console.log("point", lastPointPosition._view.y);
            },
            incrementStake() {
              this.stake++;
            },
            decrementStake() {
              this.stake--;
            }
        },
        created() {

            Chart.plugins.register({
                afterDraw: chart => {
//                    console.log(chart.config.data.datasets);

                    if (chart && chart.config.data.datasets[0].data.length == 0) {
                        // No data is present
                        var ctx = chart.chart.ctx;
                        var width = chart.chart.width;
                        var height = chart.chart.height;
                        chart.clear();

                        ctx.save();
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.font = '20px Arial';
                        ctx.fillStyle = this.color;
                        ctx.fillText(this.__('No historical data is available for this asset'), width / 2, height / 2);
                        ctx.restore();
                    }
                }
            });

            // init asset and expiry dropdowns
            this.asset = this.assets[parseInt(this.$attrs.asset) || 166]; // this will trigger updateAsset() function
            this.expiry = this.expirations[1];

            // load user data from storage
            var userData = localStorage.getItem(this.config.code);
            this.userData = userData ? JSON.parse(userData) : this.defaultUserData;

            // on quote event callback
            this.$on('quote', quote => {
                if (this.chart && this.quotes.length) {
                    this.quotes.push({ date: new Date().getTime(), price: quote });

                    if (this.quotes.length > this.config.historyLength)
                        this.quotes.shift();

                    this.displayChart();
                }
            });

            // create REST API object with onHistory callback
            this.restApi = new RestApi({
                onHistory: history => {
                    this.quotes = history;
                    this.displayChart();
                }
            });

            // retrieve history for default asset
            this.restApi.getHistory(this.asset.id, 'm1', this.config.historyLength, this.config.historyLength);

            // create WS API object with onMessage callback
            this.wsApi = new WsApi({
                onMessage: quote => this.$emit('quote', quote)
            });

            this.updateAsset();
        },
        mounted() {
            if (this.userData.trade) {
                this.setCheckTradeExpiryInterval();
                this.checkTradeExpiry();
            }
        }
    };
</script>

<style>



  * {
    font-family: 'Avenir Next', sans-serif;
  }

  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    appearance: none;
  }

  .current-price-label {
    position: absolute;
    right: 0;
    z-index: 99999999999999;
  }


  .cppg-container {
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid #dfdfdf;
  }

  .header-container {
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #f1f5f7;
  }

  .cppg-dropdowns {
    display: flex;
    flex-direction: row;
  }

  .dropdown-item {
    width: 200px;
    margin: 1rem;
  }

  .body-container {
    display: flex;
    flex-direction: row;
  }

  .chart-container {
    /* position: relative; */
    height: 420px;
    border-right: 1px solid #dfdfdf;
    flex: 2 2 0;
  }

  .cppg-panel-container {
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    margin: 1rem;
    flex: 1 1 0;
  }

  .inputs-grid {
    display: grid;
    grid-template-columns: 50% 50%;
    grid-gap: 0.5rem 0.5rem;
  }

  .inputs-title {
    grid-column: 1 / -1;
    padding: 0.5rem 0;
  }

  .inputs-input {
    padding: 0.75rem 0.5rem;
    grid-column: 1 / -1;
  }

  .input-plus-minus {
    height: 1.5rem;
  }

</style>
