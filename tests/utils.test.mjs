import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cn,
  formatDuration,
  formatNumber,
  formatDate,
  displayValue,
  isNull,
  normalizeType,
  maskValue,
} from '../.test-dist/lib/utils.js';

test('cn joins truthy classes and ignores falsey values', () => {
  assert.equal(cn('base', false, undefined, 'active', null, ''), 'base active');
});

test('formatDuration handles seconds, minutes, hours and missing values', () => {
  assert.equal(formatDuration(), '--');
  assert.equal(formatDuration(0), '0s');
  assert.equal(formatDuration(59), '59s');
  assert.equal(formatDuration(60), '1m 0s');
  assert.equal(formatDuration(3661), '1h 1m 1s');
});

test('formatNumber formats values using en-US grouping', () => {
  assert.equal(formatNumber(), '--');
  assert.equal(formatNumber(0), '0');
  assert.equal(formatNumber(1234567), '1,234,567');
});

test('formatDate handles missing, invalid and valid ISO dates', () => {
  assert.equal(formatDate(), '--');
  assert.equal(formatDate('not-a-date'), '--');
  assert.match(formatDate('2026-01-15T12:30:00.000Z'), /Jan 15, 2026/);
});

test('displayValue handles nullish, primitive and object values', () => {
  assert.equal(displayValue(null), '');
  assert.equal(displayValue(undefined), '');
  assert.equal(displayValue('Oracle'), 'Oracle');
  assert.equal(displayValue(42), '42');
  assert.equal(displayValue(false), 'false');
  assert.equal(displayValue({ id: 1 }), '{"id":1}');
});

test('displayValue falls back safely for circular objects', () => {
  const circular = {};
  circular.self = circular;
  assert.equal(displayValue(circular), '[object Object]');
});

test('isNull treats null, undefined and empty string as null-like', () => {
  assert.equal(isNull(null), true);
  assert.equal(isNull(undefined), true);
  assert.equal(isNull(''), true);
  assert.equal(isNull(0), false);
  assert.equal(isNull(false), false);
  assert.equal(isNull(' '), false);
});

test('normalizeType formats Oracle character types', () => {
  assert.equal(normalizeType('varchar2', 100), 'VARCHAR2(100)');
  assert.equal(normalizeType('CHAR', 1), 'CHAR(1)');
  assert.equal(normalizeType('NVARCHAR2'), 'NVARCHAR2(?)');
});

test('normalizeType formats Oracle NUMBER precision and scale', () => {
  assert.equal(normalizeType('number', undefined, 10, 0), 'NUMBER(10)');
  assert.equal(normalizeType('NUMBER', undefined, 12, 3), 'NUMBER(12,3)');
  assert.equal(normalizeType('NUMBER', undefined, 10), 'NUMBER');
});

test('normalizeType uppercases other Oracle data types', () => {
  assert.equal(normalizeType('timestamp with time zone'), 'TIMESTAMP WITH TIME ZONE');
  assert.equal(normalizeType('clob'), 'CLOB');
});

test('maskValue masks sensitive fields and preserves non-sensitive values', () => {
  assert.equal(maskValue('123456789', 'patient_id'), '1*******9');
  assert.equal(maskValue('Bahaa', 'patientName'), 'B***a');
  assert.equal(maskValue('01012345678', 'phone_number'), '0*********8');
  assert.equal(maskValue('not-sensitive', 'status'), 'not-sensitive');
  assert.equal(maskValue(null, 'patientName'), '');
});

test('maskValue fully masks short sensitive values', () => {
  assert.equal(maskValue('AB', 'mrn'), '***');
  assert.equal(maskValue('A', 'dob'), '***');
});
