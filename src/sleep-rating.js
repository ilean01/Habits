export const SLEEP_LABELS={
 1:'Muy mal',
 2:'Mal',
 3:'Regular',
 4:'Bien',
 5:'Excelente'
};

export function normalizeSleep(value){
 const n=Math.round(Number(value)||0);
 return n>=1&&n<=5?n:0;
}

export function sleepLabel(value){
 return SLEEP_LABELS[normalizeSleep(value)]||'Sin registrar';
}

export function sleepStars(value){
 const n=normalizeSleep(value);
 return n?'★'.repeat(n)+'☆'.repeat(5-n):'☆☆☆☆☆';
}
