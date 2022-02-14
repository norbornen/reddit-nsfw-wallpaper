import { net, Session, session } from 'electron';
import logger from 'electron-log';
import getStream from 'get-stream';
import createHttpError from 'http-errors';
import { IncomingMessage } from 'node:http';
import { Readable } from 'node:stream';
import { URL, URLSearchParams } from 'node:url';

const baseUrl = 'https://www.reddit.com/r/';
let currentSession: Session;

async function get<T>(
  endpoint: string,
  { params = {} }: { params?: Record<string, any> } = {},
): Promise<T> {
  const urlEntity = endpoint.startsWith('http')
    ? new URL(endpoint)
    : new URL(endpoint, baseUrl);
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      qs.append(key, `${value}`);
    }
  });
  urlEntity.search = qs.toString();
  const url = urlEntity.toString();

  return new Promise<T>((resolve, reject) => {
    const request = net.request({
      method: 'GET',
      url,
      session: (currentSession ||= session.fromPartition('persist:name')),
      credentials: 'include',
      useSessionCookies: true,
    });

    request.once('error', (err) => {
      logger.error(err);
      reject(err);
    });

    request.once('response', async (response) => {
      const data = await getStream(response as unknown as Readable);
      let parsedData: T;

      if (response.headers?.['content-type']?.includes('application/json')) {
        try {
          parsedData = JSON.parse(data);
        } catch (err) {
          reject(err);
          return;
        }
      } else {
        parsedData = data as unknown as T;
      }

      if (response.statusCode !== 200) {
        const errorStory: Record<string, any> = { url };
        if (typeof parsedData !== 'string') {
          Object.assign(errorStory, parsedData);
        }
        reject(createHttpError(response.statusCode, errorStory));
        logger.error(errorStory);
      } else {
        resolve(parsedData);
      }
    });

    request.end();
  });
}

async function stream(
  endpoint: string,
  { params = {} }: { params?: Record<string, any> } = {},
): Promise<IncomingMessage> {
  const urlEntity = endpoint.startsWith('http')
    ? new URL(endpoint)
    : new URL(endpoint, baseUrl);
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      qs.append(key, `${value}`);
    }
  });
  urlEntity.search = qs.toString();
  const url = urlEntity.toString();

  return new Promise<IncomingMessage>((resolve, reject) => {
    const request = net.request({
      method: 'GET',
      url,
      session: (currentSession ||= session.fromPartition('persist:name')),
      credentials: 'include',
      useSessionCookies: true,
    });

    request.once('error', (err) => {
      logger.error(err);
      reject(err);
    });

    request.once('response', async (response) => {
      if (response.statusCode !== 200) {
        const data = await getStream(response as unknown as Readable);
        let parsedData: any;
        if (response.headers?.['content-type']?.includes('application/json')) {
          try {
            parsedData = JSON.parse(data);
          } catch (err) {
            reject(err);
          }
        } else {
          parsedData = data;
        }

        const errorStory: Record<string, any> = { url };
        if (typeof parsedData !== 'string') {
          Object.assign(errorStory, parsedData);
        }
        return reject(createHttpError(response.statusCode, errorStory));
      }

      return resolve(response as IncomingMessage);
    });

    request.end();
  });
}

export default { get, stream };
