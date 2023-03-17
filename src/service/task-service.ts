import { DocumentClient, ScanInput } from 'aws-sdk/clients/dynamodb'
import { v4 as uuidv4 } from 'uuid'
import {
    Applicant, ApplicantProfile,
    PhotoEntry,
    TaskEntity,
    TaskKeyParams
} from "./task-types";

interface ReviewableServiceProps{
    taskTable: string
    profileTable: string
    bucket: string
}

export class TaskService {

    private props: ReviewableServiceProps
    private documentClient = new DocumentClient()

    public constructor(props: ReviewableServiceProps){
        this.props = props
    }

    async list(userId: string): Promise<TaskEntity[]> {
        const response = await this.documentClient
            .query({
                TableName: this.props.taskTable,
                IndexName: 'userIdIndex',
                KeyConditionExpression: 'userId = :userId',
                ExpressionAttributeValues : {':userId' : userId}
            }).promise()
        if (response.Items === undefined) {
            return [] as TaskEntity[]
        }
        return response.Items as TaskEntity[]
    }

    async query(userId: string): Promise<TaskEntity[]> {
        const response = await this.documentClient
            .scan({
                TableName: this.props.taskTable,
                IndexName: 'userIdIndex',
                ProjectionExpression: 'id, country, stateProvince, city, userId, ' +
                    'price, priceUnit, category, description, taskStatus, photos',
                FilterExpression: 'userId <> :userId',
                ExpressionAttributeValues : {':userId' : userId}
            }).promise()
        if (response.Items === undefined) {
            return [] as TaskEntity[]
        }
        return response.Items as TaskEntity[]
    }

    async get(params: TaskKeyParams): Promise<TaskEntity> {
        const response = await this.documentClient
            .get({
                TableName: this.props.taskTable,
                Key: {
                    id: params.id,
                },
            }).promise()
        return response.Item as TaskEntity
    }

    async create(params: TaskEntity): Promise<TaskEntity> {
        const now = new Date().toISOString()
        params.id = uuidv4()
        params.taskStatus = 'active'
        params.createdDateTime = now
        await this.documentClient
            .put({
                TableName: this.props.taskTable,
                Item: params,
            }).promise()
        return params
    }

    async put(params: TaskEntity): Promise<TaskEntity> {
        const response = await this.documentClient
            .put({
                TableName: this.props.taskTable,
                Item: params,
                ConditionExpression: 'userId = :userId',
                ExpressionAttributeValues : {':userId' : params.userId}
            }).promise()
        return params
    }

    async delete(params: TaskKeyParams) {
        const response = await this.documentClient
            .delete({
                TableName: this.props.taskTable,
                Key: {
                    id: params.id,
                },
                ConditionExpression: 'userId = :userId',
                ExpressionAttributeValues : {':userId' : params.userId}
            }).promise()
    }

    async listPhotos(params: TaskKeyParams): Promise<PhotoEntry[]> {
        const response = await this.documentClient
            .get({
                TableName: this.props.taskTable,
                Key: {
                    id: params.id,
                },
            }).promise()
        if (response.Item === undefined ||
            response.Item.photos === undefined ||
            response.Item.userId != params.userId) {
            throw new Error('There is no photo or user does not have an access')
        }
        return response.Item.photos as PhotoEntry[]
    }

    async listApplicants(params: TaskKeyParams): Promise<ApplicantProfile[]> {
        const response = await this.documentClient
            .get({
                TableName: this.props.taskTable,
                Key: {
                    id: params.id,
                },
            }).promise()
        const task = response.Item

        let userIds = []
        let applicants = new Map<string, Applicant>()

        if (task && task.applicants && task.userId === params.userId) {
            for (let i = 0; i < task.applicants.length; i++) {
                userIds.push(task.applicants[i].applicantId)
                applicants.set(task.applicants[i].applicantId, task.applicants[i])
            }
        }

        const response2 = await this.documentClient
            .query({
                TableName: this.props.profileTable,
                IndexName: 'userIdIndex',
                KeyConditionExpression: 'userId IN :userIds',
                ExpressionAttributeValues : {
                    ':userIds' : userIds
                }
            }).promise()
        const users = response2.Items
        const applicantProfiles : ApplicantProfile[] = []

        if (users) {
            for (let i = 0; i < users.length; i++) {
                const ap : ApplicantProfile = {
                    userId: users[i].userId,
                    applicant: applicants.get(users[i].userId),
                    name: users[i].name,
                    location: users[i].location,
                    profilePhoto: users[i].photos[0]
                }
                applicantProfiles.push(ap)
            }
        }

        return applicantProfiles
    }

    async applyForTask(params: TaskKeyParams): Promise<any> {
        const now = new Date()
        if(!params.applicantId){
            throw new Error('The applicant id is undefined.')
        }
        const newApplicant: Applicant = {
            userId: params.applicantId,
            appliedDateTime: now.toISOString(),
            applicationStatus: 'applied'
        }
        const response = await this.documentClient
            .get({
                TableName: this.props.taskTable,
                Key: {
                    id: params.id,
                },
            }).promise()
        const task = response.Item

        if (task) {
            if(task.applicants){
                const index = task.applicants
                    .findIndex((item: Applicant) => item.userId === params.applicantId)
                if(index > -1){
                    throw new Error('The applicant has already applied.')
                }
            }
            // If the user withdraw and wanted to reapply, the current code won't let it happen.

            await this.documentClient
                .update({
                    TableName: this.props.taskTable,
                    Key: {
                        id: params.id,
                    },
                    UpdateExpression: 'set applicants=list_append(' +
                        'if_not_exists(applicants, :empty_list), :newApplicants)',
                    ExpressionAttributeValues : {
                        ':empty_list': [],
                        ':newApplicants': [newApplicant]
                    }
                }).promise()
        } else {
            throw new Error('The task does not exist.')
        }
        return {}
    }

    async withdrawApplication(params: TaskKeyParams): Promise<PhotoEntry | {}> {
        const response = await this.documentClient
            .get({
                TableName: this.props.taskTable,
                Key: {
                    id: params.id,
                },
            }).promise()
        const task = response.Item

        if (task && task.applicants) {
            const index = task.applicants
                .findIndex((item: Applicant) => item.userId === params.applicantId)
            if(index === -1){
                throw new Error('The application id was not found.')
            }

            await this.documentClient
                .update({
                    TableName: this.props.taskTable,
                    Key: {
                        id: params.id,
                    },
                    UpdateExpression: `set applicants[${index}].applicationStatus=:applicationStatus`,
                    ExpressionAttributeValues : {
                        ':applicationStatus': 'withdrawn'
                    }
                }).promise()
        } else {
            throw new Error('The task or applicant does not exist.')
        }
        return {}
    }

    async acceptApplication(params: TaskKeyParams): Promise<PhotoEntry | {}> {
        const response = await this.documentClient
            .get({
                TableName: this.props.taskTable,
                Key: {
                    id: params.id,
                },
            }).promise()
        const task = response.Item

        if (task && task.applicants) {
            const index = task.applicants
                .findIndex((item: Applicant) => item.userId === params.applicantId)
            if(index === -1){
                throw new Error('The application id was not found.')
            }
            if(task.applicants[index].applicationStatus !== 'applied'){
                throw new Error('The applicant status is not active.')
            }

            await this.documentClient
                .update({
                    TableName: this.props.taskTable,
                    Key: {
                        id: params.id,
                    },
                    ConditionExpression: 'userId = :userId',
                    UpdateExpression: `set applicants[${index}].applicationStatus=:applicationStatus`,
                    ExpressionAttributeValues : {
                        ':userId': params.userId,
                        ':applicationStatus': 'acceptedToStart'
                    }
                }).promise()
        } else {
            throw new Error('The task or applicant does not exist.')
        }
        return {}
    }

    async rejectApplication(params: TaskKeyParams): Promise<PhotoEntry | {}> {
        const response = await this.documentClient
            .get({
                TableName: this.props.taskTable,
                Key: {
                    id: params.id,
                },
            }).promise()
        const task = response.Item

        if (task && task.applicants) {
            const index = task.applicants
                .findIndex((item: Applicant) => item.userId === params.applicantId)
            if(index === -1){
                throw new Error('The application id was not found.')
            }
            if(task.applicants[index].applicationStatus !== 'applied'){
                throw new Error('The applicant status is not active.')
            }

            await this.documentClient
                .update({
                    TableName: this.props.taskTable,
                    Key: {
                        id: params.id,
                    },
                    ConditionExpression: 'userId = :userId',
                    UpdateExpression: `set applicants[${index}].applicationStatus=:applicationStatus`,
                    ExpressionAttributeValues : {
                        ':userId': params.userId,
                        ':applicationStatus': 'rejected'
                    }
                }).promise()
        } else {
            throw new Error('The task or applicant does not exist.')
        }
        return {}
    }

    async getPhoto(params: TaskKeyParams, photoParams: PhotoEntry): Promise<PhotoEntry | {}> {
        const response = await this.documentClient
            .get({
                TableName: this.props.taskTable,
                Key: {
                    id: params.id,
                },
            }).promise()
        if (response.Item && response.Item.photos &&
            response.Item.userId == params.userId) {
            const photo = response.Item.photos.find(
                (item: PhotoEntry) => item.photoId === photoParams.photoId)
            if (!photo)
                return {}
            return photo
        }
        return {}
    }

    async addPhoto(params: TaskKeyParams, photoParams: PhotoEntry): Promise<PhotoEntry> {
        const photoId = uuidv4()
        const newPhoto = {
            photoId: photoId,
            bucket: this.props.bucket,
            key: `${params.id}/photos/${photoId}`,
            type: photoParams.type,
            identityId: photoParams.identityId
        }
        const response = await this.documentClient
            .update({
                TableName: this.props.taskTable,
                Key: {
                    id: params.id,
                },
                ConditionExpression: 'userId = :userId',
                UpdateExpression: 'set photos=list_append(if_not_exists(photos, :empty_list), :newPhotos)',
                ExpressionAttributeValues : {
                    ':userId': params.userId,
                    ':empty_list': [],
                    ':newPhotos': [newPhoto]
                }
            }).promise()

        return newPhoto
    }

    async deletePhoto(params: TaskKeyParams, photoParams: PhotoEntry) {
        const response = await this.documentClient
            .get({
                TableName: this.props.taskTable,
                Key: {
                    id: params.id,
                },
            }).promise()
        const profile = response.Item
        if (profile && profile.photos && profile.userId === params.userId) {
            const indexToRemove = profile.photos
                .findIndex((item: PhotoEntry) => item.photoId != photoParams.photoId)

            await this.documentClient
                .update({
                    TableName: this.props.taskTable,
                    Key: {
                        id: params.id,
                    },
                    ConditionExpression: 'userId = :userId',
                    UpdateExpression: `REMOVE photos[${indexToRemove}]`,
                    ExpressionAttributeValues : {
                        ':userId': params.userId,
                    }
                }).promise()
        }
    }

}
