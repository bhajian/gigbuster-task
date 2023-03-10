export interface TaskKeyParams {
    id: string
    userId?: string
    applicantId?: string
}
export interface PhotoEntry {
    photoId: string
    bucket?: string
    key?: string
    type?: string
}

export interface Location {
    latitude: number
    longitude: number
    address: string
}

export interface Applicant {
    userId: string
    appliedDateTime: string
    status: string
}
export interface TaskEntity {
    id: string
    userId: string
    status: string
    category: string
    description: string
    createdDateTime: string
    validTillDateTime: string
    applicants: [Applicant]
    photos: [PhotoEntry]
    location: Location
    city: string
    state: string
    country: string
    distance: number
    price: number,
    priceUnity: string
}
