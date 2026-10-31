import test from 'node:test';
import {proveI2Journey} from '../support/v3-i2-exit.mjs';

test('I2S7 combined genuine registration-to-released-summary-and-intent journey with current authority',async () => {
  console.log(JSON.stringify(await proveI2Journey()));
});
