import { APIResponse, expect } from '@playwright/test'
import { Barrel, barrelObject } from '../models/barrel.model'
import { faker } from '@faker-js/faker'
import { BarrelErrorResponse } from '../models/error-response.model'

/**
 * Generates a randomized `Barrel` object using Faker.
 * Useful for creating valid test data in a consistent format.
 *
 * @returns {Barrel} A mock barrel object with random `qr`, `rfid`, and `nfc` values.
 */
export function prepareBarrelObject(): Barrel {
  return {
    qr: faker.string.nanoid(),
    rfid: faker.string.ulid(),
    nfc: faker.string.alpha(20),
  }
}

/**
 * Validates the given API response and parses it as a `Barrel` object.
 * - Checks content-type header.
 * - Ensures response is not empty.
 * - Validates the structure using the Zod schema (`barrelObject`).
 *
 * @param {APIResponse} response - The API response from a barrel-related request.
 * @returns {Promise<Barrel>} Parsed and validated barrel data.
 */
export async function checkBarrelResponseAndReturnBody(response: APIResponse): Promise<Barrel> {
  expect(response.headers()['content-type']).toContain('application/json')
  const responseBody: Barrel = await response.json()
  expect(responseBody).toBeTruthy()
  expect(barrelObject.safeParse(responseBody).success).toBeTruthy()

  return responseBody
}

/**
 * Checks that a generic error response matches the expected structure
 * for a failed request due to validation errors.
 *
 * @param {BarrelErrorResponse} response - The parsed error response body.
 */
export function checkErrorResponse(response: BarrelErrorResponse): void {
  const validationErrorMessage = 'One or more validation errors occurred.'

  expect(response).toBeTruthy()
  expect(response.title).toBe(validationErrorMessage)
  expect(response.errors).toBeTruthy()
}

/**
 * Validates that a missing `qr` field in the request triggers the correct error response.
 *
 * @param {BarrelErrorResponse} response - The error response object returned by the API.
 */
export function checkQrRequiredErrorResponse(response: BarrelErrorResponse): void {
  const qrRequiredErrorMessage = 'The Qr field is required.'

  checkErrorResponse(response)
  expect(response.errors.Qr).toBeTruthy()
  expect(response.errors.Qr?.[0]).toBe(qrRequiredErrorMessage)
}

/**
 * Validates that a missing `rfid` field in the request triggers the correct error response.
 *
 * @param {BarrelErrorResponse} response - The error response object returned by the API.
 */
export function checkRfidRequiredErrorResponse(response: BarrelErrorResponse): void {
  const rfidRequiredErrorMessage = 'The Rfid field is required.'

  checkErrorResponse(response)
  expect(response.errors.Rfid).toBeTruthy()
  expect(response.errors.Rfid?.[0]).toBe(rfidRequiredErrorMessage)
}

/**
 * Validates that a missing `nfc` field in the request triggers the correct error response.
 *
 * @param {BarrelErrorResponse} response - The error response object returned by the API.
 */
export function checkNfcRequiredErrorResponse(response: BarrelErrorResponse): void {
  const nfcRequiredErrorMessage = 'The Nfc field is required.'

  checkErrorResponse(response)
  expect(response.errors.Nfc).toBeTruthy()
  expect(response.errors.Nfc?.[0]).toBe(nfcRequiredErrorMessage)
}