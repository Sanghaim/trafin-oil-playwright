import { faker } from '@faker-js/faker'
import { Measurement, measurementObject } from '../models/measurement.model'
import { APIResponse, expect } from '@playwright/test'
import { MeasurementErrorResponse } from '../models/error-response.model'

/**
 * Generates a randomized `Measurement` object using Faker.
 * Useful for creating valid test data in a consistent format.
 *
 * @param {string} barrelId - The ID of the barrel this measurement belongs to.
 * @returns {Measurement} A mock measurement object.
 */
export function prepareMeasurementObject(barrelId: string): Measurement {
  return {
    barrelId: barrelId,
    dirtLevel: faker.number.float({ min: 1.0, max: 95.0, fractionDigits: 2 }),
    weight: faker.number.float({ min: 100, max: 200, fractionDigits: 1 }),
  }
}

/**
 * Validates the given API response and parses it as a `Measurement` object.
 * - Checks content-type header.
 * - Ensures response is not empty.
 * - Validates the structure using the Zod schema (`measurementObject`).
 *
 * @param {APIResponse} response - The API response from a measurement-related request.
 * @returns {Promise<Measurement>} Parsed and validated measurement object.
 */
export async function checkMeasurementResponseAndReturnBody(response: APIResponse): Promise<Measurement> {
  expect(response.headers()['content-type']).toContain('application/json')
  const responseBody: Measurement = await response.json()
  expect(responseBody).toBeTruthy()
  expect(measurementObject.safeParse(responseBody).success).toBeTruthy()

  return responseBody
}

/**
 * Checks that a generic error response matches the expected structure
 * for a failed request due to validation errors.
 *
 * @param {MeasurementErrorResponse} response - The error response from the API.
 */
export function checkErrorResponse(response: MeasurementErrorResponse): void {
  const validationErrorMessage = 'One or more validation errors occurred.'

  expect(response).toBeTruthy()
  expect(response.title).toBe(validationErrorMessage)
  expect(response.errors).toBeTruthy()
}

/**
 * Validates that a missing `barrelId` triggers the correct validation error.
 *
 * @param {MeasurementErrorResponse} response - Error object from API.
 */
export function checkBarrelIdRequiredErrorResponse(response: MeasurementErrorResponse): void {
  const barrelIdRequiredErrorMessage = 'The BarrelId field is required.'

  checkErrorResponse(response)
  expect(response.errors.BarrelId).toBeTruthy()
  expect(response.errors.BarrelId[0]).toBe(barrelIdRequiredErrorMessage)
}

/**
 * Validates that a missing `dirtLevel` triggers the correct validation error.
 *
 * @param {MeasurementErrorResponse} response - Error object from API.
 */
export function checkDirtLevelRequiredErrorResponse(response: MeasurementErrorResponse): void {
  const dirtLevelRequiredErrorMessage = 'The Dirtlevel field is required.'

  checkErrorResponse(response)
  expect(response.errors.DirtLevel).toBeTruthy()
  expect(response.errors.DirtLevel[0]).toBe(dirtLevelRequiredErrorMessage)
}

/**
 * Validates that a missing `weight` triggers the correct validation error.
 *
 * @param {MeasurementErrorResponse} response - Error object from API.
 */
export function checkWeightRequiredErrorResponse(response: MeasurementErrorResponse): void {
  const weightRequiredErrorMessage = 'The Weight field is required.'

  checkErrorResponse(response)
  expect(response.errors.Weight).toBeTruthy()
  expect(response.errors.Weight[0]).toBe(weightRequiredErrorMessage)
}