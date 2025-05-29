import { test, expect } from '@playwright/test'
import {
  checkBarrelResponseAndReturnBody,
  checkErrorResponse, checkNfcRequiredErrorResponse,
  checkQrRequiredErrorResponse, checkRfidRequiredErrorResponse,
  prepareBarrelObject
} from '../helpers/barrel.helper'
import { Barrel, barrelObject } from '../models/barrel.model'
import { faker } from '@faker-js/faker'

const barrelsEndpoint = '/barrels'

/**
 * Positive test scenarios for the `/barrels` API endpoint.
 * These cover successful creation, retrieval, deletion,
 * concurrent usage.
 */
test.describe('Barrels endpoint - positive scenarios', () => {

  /**
   * Creates a barrel and validates it
   */
  test('Create valid barrel', async ({ request }) => {
    const barrel = prepareBarrelObject()
    const response = await request.post(barrelsEndpoint, { data: barrel })

    expect(response.status()).toBe(201)
    const responseBody = await checkBarrelResponseAndReturnBody(response)

    expect(responseBody.id).toBeTruthy()
    expect(responseBody.qr).toEqual(barrel.qr)
    expect(responseBody.rfid).toEqual(barrel.rfid)
    expect(responseBody.nfc).toEqual(barrel.nfc)
  })

  /**
   * Creates a barrel with minimal allowed QR length (`"T"`) to test boundary condition.
   */
  test('Create valid barrel - Minimal Qr lenght', async ({ request }) => {
    const barrel = prepareBarrelObject()
    barrel.qr = 'T'
    const response = await request.post(barrelsEndpoint, { data: barrel })
    expect(response.status()).toBe(201)
  })

  /**
   * Creates a barrel with minimal allowed RFID length.
   */
  test('Create valid barrel - Minimal Rfid lenght', async ({ request }) => {
    const barrel = prepareBarrelObject()
    barrel.rfid = 'T'
    const response = await request.post(barrelsEndpoint, { data: barrel })
    expect(response.status()).toBe(201)
  })

  /**
   * Creates a barrel with minimal allowed NFC length.
   */
  test('Create valid barrel - Minimal Nfc lenght', async ({ request }) => {
    const barrel = prepareBarrelObject()
    barrel.nfc = 'T'
    const response = await request.post(barrelsEndpoint, { data: barrel })
    expect(response.status()).toBe(201)
  })

  /**
   * Sends multiple barrel creation requests concurrently
   * to validate race condition safety and server scalability... in small scale
   */
  test('Create multiple barrels concurrently', async ({ request }) => {
    const barrelPayloads = Array.from({ length: 10 }, (_, i) => ({
      qr: `concurrent_qr_${i + 1}`,
      rfid: `concurrent_rfid_${i + 1}`,
      nfc: `concurrent_nfc_${i + 1}`,
    }))

    const createBarrel = (payload: Barrel) =>
      request.post(barrelsEndpoint, { data: payload })

    const responses = await Promise.all(barrelPayloads.map(createBarrel))

    for (const res of responses) {
      expect(res.status()).toBe(201)
    }
  })

  /**
   * Verifies if a barrel can be retrieved after creation via its ID.
   */
  test('Get created barrel', async ({ request }) => {
    const barrel = prepareBarrelObject()
    barrel.id = faker.string.ulid()
    await request.post(barrelsEndpoint, { data: barrel })
    const response = await request.get(`${barrelsEndpoint}/${barrel.id}`)

    expect(response.status()).toBe(200)
    const responseBody = await checkBarrelResponseAndReturnBody(response)

    expect(responseBody.id).toEqual(barrel.id)
    expect(responseBody.qr).toEqual(barrel.qr)
    expect(responseBody.rfid).toEqual(barrel.rfid)
    expect(responseBody.nfc).toEqual(barrel.nfc)
  })

  /**
   * Ensures a created barrel appears in the full list.
   * Also validates the response is an array of valid Barrel objects.
   */
  test('Get array of barrels and find created barrel', async ({ request }) => {
    const createdBarrelResponse = await request.post(barrelsEndpoint, { data: prepareBarrelObject() })
    expect(createdBarrelResponse.status()).toBe(201)
    const createdBarrel: Barrel = await createdBarrelResponse.json()

    const response = await request.get(barrelsEndpoint)

    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('application/json')
    const responseBody: Barrel[] = await response.json()
    expect(barrelObject.array().safeParse(responseBody).success).toBeTruthy()
    expect(responseBody.length).toBeGreaterThan(0)

    const foundBarrel = responseBody.find((barrel) => barrel.id === createdBarrel.id)
    expect(foundBarrel).toBeTruthy()
    expect(foundBarrel).toStrictEqual(createdBarrel)
  })

  /**
   * Validates that a barrel can be deleted and is no longer retrievable afterward.
   */
  test('Delete barrel', async ({ request }) => {
    const barrel = prepareBarrelObject()
    await request.post(barrelsEndpoint, { data: barrel })

    const response = await request.delete(`${barrelsEndpoint}/${barrel.id}`)

    expect(response.status()).toBe(204)

    const deleteCheck = await request.get(`${barrelsEndpoint}/${barrel.id}`)
    expect(deleteCheck.status()).toBe(404)
  })

  /**
   * Sends potentially malicious input to test how the API handles special characters,
   * scripts, and SQL injection-like strings.
   */
  test('Input will be sanitized', async ({ request }) => {
    const data: Barrel = {
      qr: '\'; DROP TABLE barrels;--',
      nfc: '<script>alert(\'xss\')</script>',
      rfid: '&#x53;ELECT * FROM information_schema.tables',
    }
    const response = await request.post(barrelsEndpoint, { data })
    expect(response.status()).toBe(201)
    const body = await checkBarrelResponseAndReturnBody(response)

    expect(body.qr).toEqual(data.qr)
    expect(body.nfc).toEqual(data.nfc)
    expect(body.rfid).toEqual(data.rfid)
  })

  /**
   * Adds an unexpected extra field (`meta`) to the payload
   * and confirms the API ignores it and returns only valid Barrel fields.
   */
  test('Extra body parameters will be ignored', async ({ request }) => {
    const data = prepareBarrelObject()
    // @ts-expect-error Barrel type does not have 'meta' attribute
    data.meta = 'data'
    const response = await request.post(barrelsEndpoint, { data })
    expect(response.status()).toBe(201)
    const body = await checkBarrelResponseAndReturnBody(response)

    expect(body).toBeTruthy()
    expect(body.id).toBeTruthy()
    expect(body.qr).toEqual(data.qr)
    expect(body.nfc).toEqual(data.nfc)
    expect(body.rfid).toEqual(data.rfid)
    // @ts-expect-error Barrel type does not have 'meta' attribute
    expect(body.meta).toBeFalsy()
  })
})

/**
 * Negative test scenarios for the `/barrels` API endpoint.
 * These validate error handling, invalid inputs, unsupported operations,
 * and response correctness in failure conditions.
 */
test.describe('Barrels endpoint - negative scenarios', () => {

  /**
   * Trying to GET a non-existent barrel should return 404.
   */
  test('Get - Barrel does not exist', async ({ request }) => {
    const response = await request.get(`${barrelsEndpoint}/I-do-not-exist`)

    expect(response.status()).toBe(404)
  })

  /**
   * Trying to DELETE a non-existent barrel should return 404.
   */
  test('Delete - Barrel does not exist', async ({ request }) => {
    const response = await request.delete(`${barrelsEndpoint}/I-do-not-exist`)

    expect(response.status()).toBe(404)
  })

  /**
   * Posting a barrel with a malformed `id` (not a GUID)
   * should fail with a 400 error and specific error details.
   */
  test('Post - ID is not guid format', async ({ request }) => {
    const barrelData = prepareBarrelObject()
    barrelData.id = 'not-guid'
    const response = await request.post(barrelsEndpoint, { data: barrelData })

    expect(response.status()).toBe(400)
    const responseBody = await response.json()
    checkErrorResponse(responseBody)
    expect(responseBody.errors.barrel).toBeTruthy()
    expect(responseBody.errors.barrel[0]).toBe('The barrel field is required.')
    expect(responseBody.errors['$.id']).toBeTruthy()
    expect(responseBody.errors['$.id'][0]).toContain('The JSON value could not be converted to System.Guid')
  })

  /**
   * Sends an unsupported Content-Type header to ensure the API
   * responds with 415 Unsupported Media Type.
   */
  test('Post - Wrong header Accept type', async ({ request }) => {
    const barrelData = prepareBarrelObject()
    const response = await request.post(barrelsEndpoint, {
      data: barrelData,
      headers: { 'content-type': 'multipart/form-data; boundary=ExampleBoundaryString' },
    })
    expect(response.status()).toBe(415)
  })

  /**
   * Posts a barrel with `qr` field too long to trigger validation error.
   *
   * NOTE: The API has no problem with field this long at this moment.
   * I would expect the data should follow some kind of structure and report it.
   */
  test('Post - Qr is too long', async ({ request }) => {
    const barrelData = prepareBarrelObject()
    barrelData.qr = 'x'.repeat(10000)
    const response = await request.post(barrelsEndpoint, { data: barrelData })
    expect(response.status()).toBe(400)
    const responseBody = await response.json()
    checkErrorResponse(responseBody)
    expect(responseBody.errors.Qr).toBeTruthy()
    expect(responseBody.errors.Qr?.[0]).toBe('Input too long')
  })

  /**
   * Posts a barrel with `rfid` field too long to trigger validation error.
   */
  test('Post - RFID is too long', async ({ request }) => {
    const barrelData = prepareBarrelObject()
    barrelData.rfid = 'x'.repeat(10000)
    const response = await request.post(barrelsEndpoint, { data: barrelData })
    expect(response.status()).toBe(400)
    const responseBody = await response.json()
    checkErrorResponse(responseBody)
    expect(responseBody.errors.Rfid).toBeTruthy()
    expect(responseBody.errors.Rfid?.[0]).toBe('Input too long')
  })

  /**
   * Posts a barrel with `nfc` field too long to trigger validation error.
   */
  test('Post - Nfc is too long', async ({ request }) => {
    const barrelData = prepareBarrelObject()
    barrelData.nfc = 'x'.repeat(10000)
    const response = await request.post(barrelsEndpoint, { data: barrelData })
    expect(response.status()).toBe(400)
    const responseBody = await response.json()
    checkErrorResponse(responseBody)
    expect(responseBody.errors.Nfc).toBeTruthy()
    expect(responseBody.errors.Nfc?.[0]).toBe('Input too long')
  })

  /**
   * Ensures the base endpoint does not allow PUT operations.
   * Expected status: 405 Method Not Allowed.
   */
  test('Put on base endpoint - Method not allowed', async ({ request }) => {
    const barrelData = prepareBarrelObject()
    barrelData.id = faker.string.uuid()
    const response = await request.put(barrelsEndpoint, { data: barrelData })
    expect(response.status()).toBe(405)
  })

  /**
   * Ensures that PUT with a valid ID path is not supported.
   * Expected status: 405 Method Not Allowed.
   */
  test('Put with id - Method not allowed', async ({ request }) => {
    const barrelData = prepareBarrelObject()
    barrelData.id = faker.string.uuid()
    const response = await request.put(`${barrelsEndpoint}/${barrelData.id}`, { data: barrelData })
    expect(response.status()).toBe(405)
  })

  /**
   * Ensures the base endpoint does not allow PATCH operations.
   * Expected status: 405 Method Not Allowed.
   */
  test('Patch on base endpoint - Method not allowed', async ({ request }) => {
    const barrelData = prepareBarrelObject()
    barrelData.id = faker.string.uuid()
    const response = await request.patch(barrelsEndpoint, { data: barrelData })
    expect(response.status()).toBe(405)
  })

  /**
   * Ensures that PATCH with an ID path is not supported.
   * Expected status: 405 Method Not Allowed.
   */
  test('Patch with id - Method not allowed', async ({ request }) => {
    const barrelData = prepareBarrelObject()
    barrelData.id = faker.string.uuid()
    const response = await request.patch(`${barrelsEndpoint}/${barrelData.id}`, { data: barrelData })
    expect(response.status()).toBe(405)
  })

  const jsonInvalidValueStringMessage = 'The JSON value could not be converted to System.String'

  /**
   * Negative tests for the `qr` attribute in POST /barrels.
   * Covers all invalid and missing input scenarios to ensure proper validation.
   */
  test.describe('Post - QR attribute', () => {
    test('QR attribute is missing', async ({ request }) => {
      const response = await request.post(barrelsEndpoint, {
        data: {
          rfid: 'filled',
          nfc: 'filled',
        },
      })

      expect(response.status()).toBe(400)
      const responseBody = await response.json()
      checkQrRequiredErrorResponse(responseBody)
    })

    test('QR attribute is null', async ({ request }) => {
      const response = await request.post(barrelsEndpoint, {
        data: {
          qr: null,
          rfid: 'filled',
          nfc: 'filled',
        },
      })

      expect(response.status()).toBe(400)
      const responseBody = await response.json()
      checkQrRequiredErrorResponse(responseBody)
    })

    test('QR attribute is undefined', async ({ request }) => {
      const response = await request.post(barrelsEndpoint, {
        data: {
          qr: undefined,
          rfid: 'filled',
          nfc: 'filled',
        },
      })

      expect(response.status()).toBe(400)
      const responseBody = await response.json()
      checkQrRequiredErrorResponse(responseBody)
    })

    test('QR attribute is empty string', async ({ request }) => {
      const response = await request.post(barrelsEndpoint, {
        data: {
          qr: '',
          rfid: 'filled',
          nfc: 'filled',
        },
      })

      expect(response.status()).toBe(400)
      const responseBody = await response.json()
      checkQrRequiredErrorResponse(responseBody)
    })

    test('QR attribute is a number', async ({ request }) => {
      const response = await request.post(barrelsEndpoint, {
        data: {
          qr: 123,
          rfid: 'filled',
          nfc: 'filled',
        },
      })

      expect(response.status()).toBe(400)
      const responseBody = await response.json()
      checkErrorResponse(responseBody)
      expect(responseBody.errors.barrel).toBeTruthy()
      expect(responseBody.errors.barrel[0]).toBe('The barrel field is required.')
      expect(responseBody.errors['$.qr']).toBeTruthy()
      expect(responseBody.errors['$.qr'][0]).toContain(jsonInvalidValueStringMessage)
    })
  })

  /**
   * Negative tests for the `RFID` attribute in POST /barrels.
   * Covers all invalid and missing input scenarios to ensure proper validation.
   */
  test.describe('Post - RFID attribute', () => {
    test('RFID attribute is missing', async ({ request }) => {
      const response = await request.post(barrelsEndpoint, {
        data: {
          qr: 'filled',
          nfc: 'filled',
        },
      })

      expect(response.status()).toBe(400)
      const responseBody = await response.json()
      checkRfidRequiredErrorResponse(responseBody)
    })

    test('RFID attribute is null', async ({ request }) => {
      const response = await request.post(barrelsEndpoint, {
        data: {
          qr: 'filled',
          rfid: null,
          nfc: 'filled',
        },
      })

      expect(response.status()).toBe(400)
      const responseBody = await response.json()
      checkRfidRequiredErrorResponse(responseBody)
    })

    test('RFID attribute is undefined', async ({ request }) => {
      const response = await request.post(barrelsEndpoint, {
        data: {
          qr: 'filled',
          rfid: undefined,
          nfc: 'filled',
        },
      })

      expect(response.status()).toBe(400)
      const responseBody = await response.json()
      checkRfidRequiredErrorResponse(responseBody)
    })

    test('RFID attribute is empty string', async ({ request }) => {
      const response = await request.post(barrelsEndpoint, {
        data: {
          qr: 'filled',
          rfid: '',
          nfc: 'filled',
        },
      })

      expect(response.status()).toBe(400)
      const responseBody = await response.json()
      checkRfidRequiredErrorResponse(responseBody)
    })

    test('RFID attribute is a number', async ({ request }) => {
      const response = await request.post(barrelsEndpoint, {
        data: {
          qr: 'filled',
          rfid: 123,
          nfc: 'filled',
        },
      })

      expect(response.status()).toBe(400)
      const responseBody = await response.json()
      checkErrorResponse(responseBody)
      expect(responseBody.errors.barrel).toBeTruthy()
      expect(responseBody.errors.barrel[0]).toBe('The barrel field is required.')
      expect(responseBody.errors['$.rfid']).toBeTruthy()
      expect(responseBody.errors['$.rfid'][0]).toContain(jsonInvalidValueStringMessage)
    })
  })

  /**
   * Negative tests for the `NFC` attribute in POST /barrels.
   * Covers all invalid and missing input scenarios to ensure proper validation.
   */
  test.describe('Post - NFC attribute', () => {
    test('NFC attribute is missing', async ({ request }) => {
      const response = await request.post(barrelsEndpoint, {
        data: {
          qr: 'filled',
          rfid: 'filled',
        },
      })

      expect(response.status()).toBe(400)
      const responseBody = await response.json()
      checkNfcRequiredErrorResponse(responseBody)
    })

    test('NFC attribute is null', async ({ request }) => {
      const response = await request.post(barrelsEndpoint, {
        data: {
          qr: 'filled',
          rfid: 'filled',
          nfc: null,
        },
      })

      expect(response.status()).toBe(400)
      const responseBody = await response.json()
      checkNfcRequiredErrorResponse(responseBody)
    })

    test('NFC attribute is undefined', async ({ request }) => {
      const response = await request.post(barrelsEndpoint, {
        data: {
          qr: 'filled',
          rfid: 'filled',
          nfc: undefined,
        },
      })

      expect(response.status()).toBe(400)
      const responseBody = await response.json()
      checkNfcRequiredErrorResponse(responseBody)
    })

    test('NFC attribute is empty string', async ({ request }) => {
      const response = await request.post(barrelsEndpoint, {
        data: {
          qr: 'filled',
          rfid: 'filled',
          nfc: '',
        },
      })

      expect(response.status()).toBe(400)
      const responseBody = await response.json()
      checkNfcRequiredErrorResponse(responseBody)
    })

    test('NFC attribute is a number', async ({ request }) => {
      const response = await request.post(barrelsEndpoint, {
        data: {
          qr: 'filled',
          rfid: 'filled',
          nfc: 123,
        },
      })

      expect(response.status()).toBe(400)
      const responseBody = await response.json()
      checkErrorResponse(responseBody)
      expect(responseBody.errors.barrel).toBeTruthy()
      expect(responseBody.errors.barrel[0]).toBe('The barrel field is required.')
      expect(responseBody.errors['$.nfc']).toBeTruthy()
      expect(responseBody.errors['$.nfc'][0]).toContain(jsonInvalidValueStringMessage)
    })
  })
})
