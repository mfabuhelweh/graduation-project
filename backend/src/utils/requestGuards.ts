import type { Request } from 'express';
import { env } from '../config/env.js';

function normalizeAddress(address?: string | null) {
  if (!address) return '';
  return address.replace(/^::ffff:/, '').trim().toLowerCase();
}

function isLoopbackAddress(address?: string | null) {
  const normalized = normalizeAddress(address);
  return normalized === '127.0.0.1' || normalized === '::1' || normalized === 'localhost';
}

function isPrivateNetworkAddress(address?: string | null) {
  const normalized = normalizeAddress(address);
  if (!normalized) return false;

  if (isLoopbackAddress(normalized)) {
    return true;
  }

  return (
    /^10\./.test(normalized) ||
    /^192\.168\./.test(normalized) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)
  );
}

function extractHostname(value?: string | null) {
  if (!value) return '';

  try {
    return normalizeAddress(new URL(value).hostname);
  } catch {
    return '';
  }
}

export function getRequestedDemoModes(req: Request) {
  const headerValue = req.header('X-Demo-Mode') || req.header('x-demo-mode') || '';
  return new Set(
    headerValue
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isTrustedLocalRequest(req: Request) {
  const ip = normalizeAddress(req.ip);
  const remoteAddress = normalizeAddress(req.socket.remoteAddress);
  const originHost = extractHostname(req.header('Origin'));
  const refererHost = extractHostname(req.header('Referer'));

  return (
    isPrivateNetworkAddress(ip) ||
    isPrivateNetworkAddress(remoteAddress) ||
    isPrivateNetworkAddress(originHost) ||
    isPrivateNetworkAddress(refererHost)
  );
}

export function canUseDemoMode(req: Request, mode: string) {
  const sandboxEnabled = env.enableDevAuth || env.allowSandboxOtpInProduction;

  if (!sandboxEnabled) {
    return false;
  }

  if (env.nodeEnv !== 'production' && !isTrustedLocalRequest(req)) {
    return false;
  }

  const modes = getRequestedDemoModes(req);
  if (modes.size === 0) {
    return true;
  }

  return modes.has('all') || modes.has(mode.toLowerCase());
}

export function maskPhoneNumberForLog(phoneNumber: string) {
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  if (digitsOnly.length < 4) {
    return 'hidden';
  }

  return `${digitsOnly.slice(0, 3)}****${digitsOnly.slice(-2)}`;
}
