/**
 * Format string almost like sprintf
 *
 * @returns {*}
 */
export function format() {
    var args = arguments;
    return args[0].replace(/{(\d+)}/g, (match, number) => {
        var n = parseInt(number, 10);
        return typeof args[n+1] != 'undefined' ? args[n+1] : match;
    });
}

/**
 * Check whether supplied object is array
 *
 * @param object
 * @returns {boolean}
 */
export function isArray(object) {
    if (typeof object != 'object')
        return false;

    if (typeof Array.isArray != 'undefined') {
        return Array.isArray(object);
    } else {
        return Object.prototype.toString.call(object) === '[object Array]';
    }
}

/**
 * Split array into fixed length chunks
 *
 * @param array
 * @param chunk
 * @returns {Array}
 */
export function chunks(array, chunk) {
    var i,j;
    var result = [];
    for (i = 0, j = array.length; i<j; i+=chunk) {
        result.push(array.slice(i,i+chunk));
    }
    return result;
}