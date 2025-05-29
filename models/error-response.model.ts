export interface ErrorResponse {
  title: string,
  status: number,
}

export interface BarrelErrorResponse extends ErrorResponse {
  errors: {
    Qr?: string[],
    Nfc?: string[],
    Rfid?: string[],
  }
}

export interface MeasurementErrorResponse extends ErrorResponse {
  errors: {
    BarrelId?: string[],
    DirtLevel?: string[],
    Weight?: string[],
  }
}

