import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });
import diagnostics_channel from 'node:diagnostics_channel';
import { performance } from 'node:perf_hooks';
import { afterAll, beforeAll } from '@jest/globals';

let totalRequests = 0;
let totalDuration = 0;
const activeRequests = new Map<any, number>();

const onCreate = (message: any) => {
  totalRequests++;
  activeRequests.set(message.request, performance.now());
};

const onComplete = (message: any) => {
  const startTime = activeRequests.get(message.request);
  if (startTime !== undefined) {
    totalDuration += performance.now() - startTime;
    activeRequests.delete(message.request);
  }
};

beforeAll(() => {
  diagnostics_channel.channel('undici:request:create').subscribe(onCreate);
  diagnostics_channel.channel('undici:request:headers').subscribe(onComplete);
  diagnostics_channel.channel('undici:request:error').subscribe(onComplete);
});

afterAll(() => {
  diagnostics_channel.channel('undici:request:create').unsubscribe(onCreate);
  diagnostics_channel.channel('undici:request:headers').unsubscribe(onComplete);
  diagnostics_channel.channel('undici:request:error').unsubscribe(onComplete);

  if (totalRequests > 0) {
    console.log(
      `\n[Jest HTTP Metrics] Sent ${totalRequests} requests. Total processing time: ${totalDuration.toFixed(2)}ms (avg: ${(totalDuration / totalRequests).toFixed(2)}ms/request)\n`
    );
  }
});
