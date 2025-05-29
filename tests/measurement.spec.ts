import { test, expect } from '@playwright/test'
import { prepareBarrelObject } from '../helpers/barrel.helper'
import { Barrel } from '../models/barrel.model'
import {
  checkBarrelIdRequiredErrorResponse, checkDirtLevelRequiredErrorResponse, checkErrorResponse,
  checkMeasurementResponseAndReturnBody, checkWeightRequiredErrorResponse,
  prepareMeasurementObject
} from '../helpers/measurement.helper'
import { Measurement, measurementObject } from '../models/measurement.model'
import { faker } from '@faker-js/faker'
import { ErrorResponse, MeasurementErrorResponse } from '../models/error-response.model'

const measurementsEndpoint = '/measurements'

/**
 * Tests for `/measurements` API endpoint — positive scenarios.
 * Covers CRUD operations.
 */
test.describe('Measurements endpoint - positive scenarios', () => {
  let barrelId: string

  /**
   * Creates a barrel before all tests so measurements can be linked to it.
   */
  test.beforeAll(async ({ request }) => {
    const response = await request.post('/barrels', { data: prepareBarrelObject() })
    expect(response.status()).toBe(201)
    barrelId = (await response.json()).id
  })

  /**
   * Validates that a valid measurement can be created.
   */
  test('Create valid measurement', async ({ request }) => {
    const measurement = prepareMeasurementObject(barrelId)
    const response = await request.post(measurementsEndpoint, { data: measurement })

    expect(response.status()).toBe(201)
    const body: Measurement = await checkMeasurementResponseAndReturnBody(response)

    expect(body.id).toBeTruthy()
    expect(body.barrelId).toBe(barrelId)
    expect(body.weight).toBe(measurement.weight)
    expect(body.dirtLevel).toBe(measurement.dirtLevel)
  })

  /**
   * Validates that a created measurement can be retrieved by ID.
   */
  test('Get created measurement', async ({ request }) => {
    const measurement = prepareMeasurementObject(barrelId)
    const createResponse = await request.post(measurementsEndpoint, { data: measurement })
    const createdMeasurementBody: Measurement = await createResponse.json()

    const getResponse = await request.get(`${measurementsEndpoint}/${createdMeasurementBody.id}`)
    const body = await checkMeasurementResponseAndReturnBody(getResponse)
    expect(body.id).toBe(createdMeasurementBody.id)
    expect(body.barrelId).toBe(barrelId)
    expect(body.weight).toBe(measurement.weight)
    expect(body.dirtLevel).toBe(measurement.dirtLevel)
  })

  /**
   * Validates that created measurement appears in list of all measurements.
   */
  test('Get array of measurements and find created', async ({ request }) => {
    const measurement = prepareMeasurementObject(barrelId)
    const createResponse = await request.post(measurementsEndpoint, { data: measurement })
    const createdMeasurementBody = await createResponse.json()

    const getResponse = await request.get(measurementsEndpoint)
    const body: Measurement[] = await getResponse.json()
    expect(measurementObject.array().safeParse(body).success).toBeTruthy()
    expect(body.length).toBeGreaterThan(0)
    const foundMeasurement = body.find((measurement) => measurement.id === createdMeasurementBody.id)
    expect(foundMeasurement).toBeTruthy()
    expect(foundMeasurement).toStrictEqual(createdMeasurementBody)
  })

  /**
   * Validates that deleting a barrel deletes all its associated measurements.
   * NOTE: I expect that there is cascade-style behavior set in the DB
   */
  test('Deleted barrel deletes linked measurements', async ({ request }) => {
    const barrelResponse = await request.post('/barrels', { data: prepareBarrelObject() })
    expect(barrelResponse.status()).toBe(201)
    const barrelToBeDeleted: Barrel = await barrelResponse.json()
    if (!barrelToBeDeleted.id) {
      throw new Error('API did not returned valid barrel object')
    }

    let measurementResponse = await request.post(measurementsEndpoint,
      { data: prepareMeasurementObject(barrelToBeDeleted.id) }
    )
    expect(measurementResponse.status()).toBe(201)

    const deleteBarrelResponse = await request.delete(`/barrels/${barrelToBeDeleted.id}`)
    expect(deleteBarrelResponse.status()).toBe(204)
    measurementResponse = await request.get(`${measurementsEndpoint}/${(await measurementResponse.json()).id}`)
    expect(measurementResponse.status()).toBe(404)
  })
})

/**
 * Tests for `/measurements` API endpoint — negative scenarios.
 */
test.describe('Measurements endpoint - negative scenarios', () => {
  let barrel: Barrel

  /**
   * Sets up a valid barrel for testing invalid measurement input cases.
   */
  test.beforeAll(async ({ request }) => {
    const response = await request.post('/barrels', { data: prepareBarrelObject() })
    expect(response.status()).toBe(201)
    barrel = await response.json()
  })

  /**
   * Validates behavior when using non-existent barrel ID.
   */
  test('Post - Barrel does not exists', async ({ request }) => {
    const barrelId = faker.string.uuid()
    await request.delete(`/barrels/${barrelId}`)
    const measurement = prepareMeasurementObject(barrelId)
    const response = await request.post(measurementsEndpoint, { data: measurement })

    expect(response.status()).toBe(404)
    const body: ErrorResponse = await response.json()
    expect(body.title).toBeTruthy()
    expect(body.title).toBe('Barrel was not found.')
  })

  /**
   * Validates response when getting a non-existent measurement.
   */
  test('Get - Measurement does not exists', async ({ request }) => {
    const measurementId = faker.string.uuid()
    await request.delete(`${measurementsEndpoint}/${measurementId}`)

    const response = await request.get(`${measurementsEndpoint}/${measurementId}`)
    expect(response.status()).toBe(404)
  })

  /**
   * Set of tests that validates corrects validations for 'barrelId' field
   */
  test.describe('Post - Barrel Id', () => {
    test('Barrel Id is missing', async ({ request }) => {
      const response = await request.post(measurementsEndpoint, {
        data: {
          dirtLevel: 10,
          weight: 10,
        },
      })
      expect(response.status()).toBe(400)
      checkBarrelIdRequiredErrorResponse(await response.json())
    })

    test('Barrel Id is null', async ({ request }) => {
      const response = await request.post(measurementsEndpoint, {
        data: {
          barrelId: null,
          dirtLevel: 10,
          weight: 10,
        },
      })
      expect(response.status()).toBe(400)
      checkBarrelIdRequiredErrorResponse(await response.json())
    })

    test('Barrel Id is undefined', async ({ request }) => {
      const response = await request.post(measurementsEndpoint, {
        data: {
          barrelId: undefined,
          dirtLevel: 10,
          weight: 10,
        },
      })
      expect(response.status()).toBe(400)
      checkBarrelIdRequiredErrorResponse(await response.json())
    })

    test('Barrel Id is empty string', async ({ request }) => {
      const response = await request.post(measurementsEndpoint, {
        data: {
          barrelId: '',
          dirtLevel: 10,
          weight: 10,
        },
      })
      expect(response.status()).toBe(400)
      checkBarrelIdRequiredErrorResponse(await response.json())
    })
  })

  /**
   * Set of tests that validates corrects validations for 'dirtLevel' field
   */
  test.describe('Post - Dirt level', () => {
    test('Dirt level is missing', async ({ request }) => {
      const response = await request.post(measurementsEndpoint, {
        data: {
          barrelId: barrel.id,
          weight: 10,
        },
      })
      expect(response.status()).toBe(400)
      checkDirtLevelRequiredErrorResponse(await response.json())
    })

    test('Dirt level is null', async ({ request }) => {
      const response = await request.post(measurementsEndpoint, {
        data: {
          barrelId: barrel.id,
          dirtLevel: null,
          weight: 10,
        },
      })
      expect(response.status()).toBe(400)
      checkDirtLevelRequiredErrorResponse(await response.json())
    })

    test('Dirt level is undefined', async ({ request }) => {
      const response = await request.post(measurementsEndpoint, {
        data: {
          barrelId: barrel.id,
          dirtLevel: undefined,
          weight: 10,
        },
      })
      expect(response.status()).toBe(400)
      checkDirtLevelRequiredErrorResponse(await response.json())
    })

    test('Dirt level is negative number', async ({ request }) => {
      const response = await request.post(measurementsEndpoint, {
        data: {
          barrelId: barrel.id,
          dirtLevel: -10,
          weight: 10,
        },
      })
      expect(response.status()).toBe(400)
      const body: MeasurementErrorResponse = await response.json()
      checkErrorResponse(body)
      expect(body.errors.DirtLevel).toBeTruthy()
      expect(body.errors.DirtLevel?.[0]).toBeTruthy()
      expect(body.errors.DirtLevel?.[0]).toBe('DirtLevel must be positive number')
    })
  })

  /**
   * Set of tests that validates corrects validations for 'weight' field
   */
  test.describe('Post - Weight', () => {
    test('Weight is missing', async ({ request }) => {
      const response = await request.post(measurementsEndpoint, {
        data: {
          barrelId: barrel.id,
          dirtLevel: 10,
        },
      })
      expect(response.status()).toBe(400)
      checkWeightRequiredErrorResponse(await response.json())
    })

    test('Weight is null', async ({ request }) => {
      const response = await request.post(measurementsEndpoint, {
        data: {
          barrelId: barrel.id,
          dirtLevel: 10,
          weight: null,
        },
      })
      expect(response.status()).toBe(400)
      checkWeightRequiredErrorResponse(await response.json())
    })

    test('Weight is undefined', async ({ request }) => {
      const response = await request.post(measurementsEndpoint, {
        data: {
          barrelId: barrel.id,
          dirtLevel: 10,
          weight: undefined,
        },
      })
      expect(response.status()).toBe(400)
      checkWeightRequiredErrorResponse(await response.json())
    })

    test('Weight is negative number', async ({ request }) => {
      const response = await request.post(measurementsEndpoint, {
        data: {
          barrelId: barrel.id,
          dirtLevel: 10,
          weight: -10,
        },
      })
      expect(response.status()).toBe(400)
      const body: MeasurementErrorResponse = await response.json()
      checkErrorResponse(body)
      expect(body.errors.Weight).toBeTruthy()
      expect(body.errors.Weight?.[0]).toBe('Weight must be positive number')
    })
  })
})