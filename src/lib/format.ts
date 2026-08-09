// €1.500, non €1500
const EUR = new Intl.NumberFormat("it-IT");

export const euro = (n: number) => `€${EUR.format(n)}`;
