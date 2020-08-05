import numeral from 'numeral'
import Vue from 'vue'
import VueSelect from 'vue-select/dist/vue-select'
import Game from './components/game.vue'
import App from './App.vue'

// import polyfills for older browsers
if (!global._babelPolyfill)
    require('@babel/polyfill');

// default configuration
var config = {
    id: 'cryptocurrency-price-prediction-game',
    code: 'cppg',
    historyLength: 20,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    locale: 'en-US',
    text: {}
};

// overwrite default config if global variable is set
config = Object.assign({}, config, window.CryptocurrencyPricePredictionGame || {});

// register custom numeral locale
numeral.register('locale', 'custom', {
    delimiters: {
        decimal: config.decimalSeparator,
        thousands: config.thousandsSeparator
    },
    ordinal: function (number) {
        return '';
    },
    currency: {
        symbol: '$'
    }
});
numeral.locale('custom');

// Vue game component
Vue.component(config.id, Game);
Vue.component('vue-select', VueSelect);

const games = document.querySelectorAll(config.id); // NodeList object, not an array

// init widget based on the DOM element passed in
const initGame = game => {
    var gameWrapper = document.createElement('div'); // create wrapper element
    gameWrapper.classList.add(config.code); // add generic class name to the wrapper element
    game.parentNode.insertBefore(gameWrapper, game);
    gameWrapper.appendChild(game); // insert game into the wrapper element

    // initialize Vue instance
    new Vue({
      render: h => h(Game),
      data() {
        return {
          config: config
        }
      }
        // el: gameWrapper,
        // data() {
        //     return {
        //         config: config
        //     }
        // }
    }).$mount(gameWrapper);
};

// init all widgets in the DOM
[...games].forEach(game => initGame(game));
