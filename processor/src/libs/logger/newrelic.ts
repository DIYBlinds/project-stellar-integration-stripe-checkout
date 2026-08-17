import { config } from '../../config/config';
import Transport from 'winston-transport';
import { getRequestContext } from '../fastify/context/context';

const NEWRELIC_API_URL = 'https://log-api.newrelic.com/log/v1';

type NewRelicLogInfo = {
  level: string;
  message?: unknown;
  [key: string]: unknown;
};

export class NewRelicTransport extends Transport {
  log(info: NewRelicLogInfo, callback: () => void) {
    setImmediate(() => callback());

    try {
      const { level, message, ...meta } = info;
      logToNewRelic({
        message: typeof message === 'string' ? message : JSON.stringify(message),
        level,
        correlationId: getRequestContext().correlationId || '',
        data: meta,
      });
    } catch {
      // Swallow — never throw from a transport
    }
  }
}

function logToNewRelic({
  message,
  level,
  correlationId,
  data,
}: {
  message: string;
  level: string;
  correlationId: string;
  data: unknown;
}) {
  if (!config.newRelicApiKey || !data) return;

  try {
    const attributes = {
      source: 'stripe-payment-connector',
      level,
      correlationId,
      project: config.projectKey,
      data,
    };
    const body = [{ message, attributes }];
    void fetch(NEWRELIC_API_URL, {
      method: 'POST',
      headers: {
        'Api-Key': config.newRelicApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }).catch((error) => {
      console.error('Failed pushing data to newrelic', error);
    });
  } catch (error) {
    console.error('Failed pushing data to newrelic', error);
  }
}
