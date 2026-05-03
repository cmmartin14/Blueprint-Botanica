import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../app/api/reminders/email/route';
import { NextResponse } from 'next/server';

// Mock NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body, init) => ({
      json: async () => body,
      status: init?.status || 200,
      ok: (init?.status || 200) >= 200 && (init?.status || 200) < 300,
    })),
  },
}));

describe('POST /api/reminder-email', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
    global.fetch = vi.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Validation', () => {
    it('should return 400 if recipient email is missing', async () => {
      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          subject: 'Test',
          text: 'Test message',
        }),
      });

      await POST(request);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Recipient email is required.' },
        { status: 400 }
      );
    });

    it('should return 400 if recipient email is empty string', async () => {
      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          to: '   ',
          subject: 'Test',
          text: 'Test message',
        }),
      });

      await POST(request);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Recipient email is required.' },
        { status: 400 }
      );
    });

    it('should return 400 if both text and html are missing', async () => {
      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          to: 'test@example.com',
          subject: 'Test',
        }),
      });

      await POST(request);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'At least one of text or html is required.' },
        { status: 400 }
      );
    });

    it('should return 400 if text and html are empty strings', async () => {
      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          to: 'test@example.com',
          subject: 'Test',
          text: '  ',
          html: '  ',
        }),
      });

      await POST(request);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'At least one of text or html is required.' },
        { status: 400 }
      );
    });
  });

  describe('Development Mode (EMAIL_SIMULATION=1)', () => {
    it('should simulate email sending when EMAIL_SIMULATION=1', async () => {
      process.env.EMAIL_SIMULATION = '1';
      const consoleSpy = vi.spyOn(console, 'log');

      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          to: 'test@example.com',
          subject: 'Test Subject',
          text: 'Test message',
        }),
      });

      await POST(request);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[ReminderEmail] Simulated email send',
        {
          to: 'test@example.com',
          subject: 'Test Subject',
          text: 'Test message',
          html: undefined,
        }
      );
      expect(NextResponse.json).toHaveBeenCalledWith({
        ok: true,
        simulated: true,
      });
      expect(global.fetch).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Configuration Errors', () => {
    it('should return 500 if RESEND_API_KEY is missing', async () => {
      delete process.env.RESEND_API_KEY;
      process.env.EMAIL_FROM = 'sender@example.com';
      process.env.EMAIL_SIMULATION = '0';

      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          to: 'test@example.com',
          text: 'Test message',
        }),
      });

      await POST(request);

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          error:
            'Email service not configured. Set RESEND_API_KEY and EMAIL_FROM, or set EMAIL_SIMULATION=1 for local testing.',
        },
        { status: 500 }
      );
    });

    it('should return 500 if EMAIL_FROM is missing', async () => {
      process.env.RESEND_API_KEY = 'test-key';
      delete process.env.EMAIL_FROM;
      process.env.EMAIL_SIMULATION = '0';

      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          to: 'test@example.com',
          text: 'Test message',
        }),
      });

      await POST(request);

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          error:
            'Email service not configured. Set RESEND_API_KEY and EMAIL_FROM, or set EMAIL_SIMULATION=1 for local testing.',
        },
        { status: 500 }
      );
    });
  });

  describe('Successful Email Sending', () => {
    beforeEach(() => {
      process.env.RESEND_API_KEY = 'test-api-key';
      process.env.EMAIL_FROM = 'sender@example.com';
      delete process.env.EMAIL_SIMULATION;
    });

    it('should send email with text content', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'email-123' }),
      });

      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          to: 'test@example.com',
          subject: 'Test Subject',
          text: 'Test message',
        }),
      });

      await POST(request);

      expect(global.fetch).toHaveBeenCalledWith('https://api.resend.com/emails', expect.any(Object));
      
      const fetchCall = (global.fetch as any).mock.calls[0][1];
      expect(fetchCall.method).toBe('POST');
      expect(fetchCall.headers).toEqual({
        Authorization: 'Bearer test-api-key',
        'Content-Type': 'application/json',
      });
      
      const bodyParsed = JSON.parse(fetchCall.body);
      expect(bodyParsed).toEqual({
        from: 'sender@example.com',
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test message',
      });

      expect(NextResponse.json).toHaveBeenCalledWith({
        ok: true,
        id: 'email-123',
      });
    });

    it('should send email with html content', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'email-456' }),
      });

      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          to: 'test@example.com',
          subject: 'Test Subject',
          html: '<p>Test message</p>',
        }),
      });

      await POST(request);

      expect(global.fetch).toHaveBeenCalledWith('https://api.resend.com/emails', expect.any(Object));
      
      const fetchCall = (global.fetch as any).mock.calls[0][1];
      expect(fetchCall.method).toBe('POST');
      expect(fetchCall.headers).toEqual({
        Authorization: 'Bearer test-api-key',
        'Content-Type': 'application/json',
      });
      
      const bodyParsed = JSON.parse(fetchCall.body);
      expect(bodyParsed).toEqual({
        from: 'sender@example.com',
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test message</p>',
      });

      expect(NextResponse.json).toHaveBeenCalledWith({
        ok: true,
        id: 'email-456',
      });
    });

    it('should send email with both text and html content', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'email-789' }),
      });

      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          to: 'test@example.com',
          subject: 'Test Subject',
          text: 'Test message',
          html: '<p>Test message</p>',
        }),
      });

      await POST(request);

      expect(global.fetch).toHaveBeenCalledWith('https://api.resend.com/emails', expect.any(Object));
      
      const fetchCall = (global.fetch as any).mock.calls[0][1];
      expect(fetchCall.method).toBe('POST');
      expect(fetchCall.headers).toEqual({
        Authorization: 'Bearer test-api-key',
        'Content-Type': 'application/json',
      });
      
      const bodyParsed = JSON.parse(fetchCall.body);
      expect(bodyParsed).toEqual({
        from: 'sender@example.com',
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test message',
        html: '<p>Test message</p>',
      });

      expect(NextResponse.json).toHaveBeenCalledWith({
        ok: true,
        id: 'email-789',
      });
    });

    it('should use default subject if not provided', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'email-default' }),
      });

      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          to: 'test@example.com',
          text: 'Test message',
        }),
      });

      await POST(request);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          body: expect.stringContaining('Blueprint Botanica reminder'),
        })
      );
    });

    it('should trim whitespace from all fields', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'email-trim' }),
      });

      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          to: '  test@example.com  ',
          subject: '  Test Subject  ',
          text: '  Test message  ',
        }),
      });

      await POST(request);

      const fetchCall = (global.fetch as any).mock.calls[0][1];
      const bodyParsed = JSON.parse(fetchCall.body);

      expect(bodyParsed.to).toBe('test@example.com');
      expect(bodyParsed.subject).toBe('Test Subject');
      expect(bodyParsed.text).toBe('Test message');
    });
  });

  describe('Resend API Errors', () => {
    beforeEach(() => {
      process.env.RESEND_API_KEY = 'test-api-key';
      process.env.EMAIL_FROM = 'sender@example.com';
      delete process.env.EMAIL_SIMULATION;
    });

    it('should return 502 if Resend API returns error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Invalid API key' }),
      });

      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          to: 'test@example.com',
          text: 'Test message',
        }),
      });

      await POST(request);

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          error: 'Failed to send email.',
          details: { message: 'Invalid API key' },
        },
        { status: 502 }
      );
    });

    it('should handle Resend API response without json', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          to: 'test@example.com',
          text: 'Test message',
        }),
      });

      await POST(request);

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          error: 'Failed to send email.',
          details: null,
        },
        { status: 502 }
      );
    });

    it('should return id as null if not provided in response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          to: 'test@example.com',
          text: 'Test message',
        }),
      });

      await POST(request);

      expect(NextResponse.json).toHaveBeenCalledWith({
        ok: true,
        id: null,
      });
    });
  });

  describe('Unexpected Errors', () => {
    it('should handle JSON parsing errors', async () => {
      const request = new Request('http://localhost', {
        method: 'POST',
        body: 'invalid json',
      });

      await POST(request);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/Unexpected|invalid/i),
        }),
        { status: 500 }
      );
    });

    it('should handle network errors', async () => {
      process.env.RESEND_API_KEY = 'test-api-key';
      process.env.EMAIL_FROM = 'sender@example.com';

      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({
          to: 'test@example.com',
          text: 'Test message',
        }),
      });

      await POST(request);

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          error: 'Network error',
        },
        { status: 500 }
      );
    });
  });
});