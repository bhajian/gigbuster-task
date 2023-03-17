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
    identityId?: string
}

export interface Location {
    latitude: number
    longitude: number
    locationName: string
}

export interface Applicant {
    userId: string
    appliedDateTime: string
    applicationStatus: string
}

export interface ApplicantProfile {
    userId: string
    applicant?: Applicant
    name: string
    location: Location
    profilePhoto: PhotoEntry
}

export interface TaskEntity {
    id: string
    title: string
    userId: string
    taskStatus: string
    category: string
    description: string
    createdDateTime: string
    validTillDateTime: string
    applicants: [Applicant]
    photos: [PhotoEntry]
    location: Location
    city: string
    stateProvince: string
    country: string
    distance: number
    price: number,
    priceUnit: string
}
