import numeral from 'numeral';

// format number as integer
export function integer(number) {
    return numeral(number).format('0,0');
}

// format number as decimal
export function decimal(number) {
    var num = numeral(number);
    var formatted = num.format('0,0.00');
    return formatted!=='NaN' ? formatted : parseFloat(number).toFixed(2);
}

// format number as decimal with percent sign
export function percentage(number) {
    return decimal(number)+'%';
}

export function variableDecimal(number) {
    var format;
    var num = numeral(number);
    var n = Math.abs(num.value());
    if (n >= 10) {
        format = '0,0.00';
    } else if (n == 0) {
        format = '0.00';
    } else if (1 <= n && n < 10) {
        format = '0.0000';
    } else if (n < 1) {
        format = '0.00000000';
    }
    // for small numbers like  9.2e-7 numeral.format() will return NaN, so need a workaround
    var formatted = num.format(format);
    return formatted!=='NaN' ? formatted : parseFloat(number).toFixed(8);
}