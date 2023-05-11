export interface KeyParams {
    transactionId?: string
    userId?: string
    workerId?: string
    referrerId?: string
    taskId?: string
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

export interface ApplicantProfile {
    transaction?: TransactionEntity
    name: string
    accountCode:string
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
    photos: [PhotoEntry]
    location: Location
    city: string
    stateProvince: string
    country: string
    distance: number
    price: number,
    priceUnit: string
}

export interface TransactionEntity {
    id: string
    type: string
    createdAt: string
    lastUpdatedAt?: string
    lastMessage?: string
    taskId?: string
    customerId?: string
    workerId?: string
    referrerId?: string
    senderId?: string
    receiverId?: string
    lastSenderRead?: string
    lastReceiverRead?: string
    status: string
    price?: string
    paymentTransactionId?: string
}
