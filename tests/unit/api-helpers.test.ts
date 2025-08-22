import { describe, it, expect } from 'vitest';
import { sendOk, sendErr } from '../../server/lib/http';

// Mock Response object for testing
class MockResponse {
  statusCode = 200;
  data: any = null;
  headers: Record<string, string> = {};

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  json(data: any) {
    this.data = data;
    return this;
  }

  setHeader(name: string, value: string) {
    this.headers[name] = value;
    return this;
  }
}

describe('HTTP Helper Functions', () => {
  it('sendOk sends successful response with data', () => {
    const res = new MockResponse() as any;
    const testData = { id: 1, name: 'Test' };

    sendOk(res, testData);

    expect(res.statusCode).toBe(200);
    expect(res.data).toEqual({
      success: true,
      data: testData
    });
  });

  it('sendOk sends response with custom status code', () => {
    const res = new MockResponse() as any;
    const testData = { id: 1, name: 'Test' };

    sendOk(res, testData, undefined, 201);

    expect(res.statusCode).toBe(201);
    expect(res.data.success).toBe(true);
    expect(res.data.data).toEqual(testData);
  });

  it('sendOk includes count when provided', () => {
    const res = new MockResponse() as any;
    const testData = [{ id: 1 }, { id: 2 }];

    sendOk(res, testData, 2);

    expect(res.data.count).toBe(2);
    expect(res.data.data).toEqual(testData);
  });

  it('sendErr sends error response', () => {
    const res = new MockResponse() as any;
    const errorMessage = 'Something went wrong';

    sendErr(res, errorMessage, 400);

    expect(res.statusCode).toBe(400);
    expect(res.data.success).toBe(false);
    expect(res.data.error).toBeDefined();
  });

  it('sendErr accepts status code parameter', () => {
    const res = new MockResponse() as any;

    sendErr(res, 'Internal error', 500);

    expect(res.statusCode).toBe(500);
    expect(res.data.success).toBe(false);
  });
});