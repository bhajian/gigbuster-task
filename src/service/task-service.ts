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

    async query(params: any): Promise<any[]> {
        const response = await this.documentClient
            .scan({
                TableName: this.props.taskTable,
                ProjectionExpression: 'id, country, stateProvince, city, userId, ' +
                    'price, priceUnit, category, description, taskStatus, photos',
                FilterExpression: 'userId <> :userId',
                ExpressionAttributeValues : {':userId' : params.userId},
                Limit: params.Limit,
                ExclusiveStartKey: params.lastEvaluatedKey
            }).promise()
        if (response.Items === undefined) {
            return [] as TaskEntity[]
        }

        const tasks = response.Items
        let userIds = []
        let tasksMap = new Map<string, any>()
        if (tasks) {
            for (let i = 0; i < tasks.length; i++) {
                const userId = tasks[i].userId
                if(tasksMap.has(userId)){
                } else {
                    userIds.push({accountId: tasks[i].userId})
                    tasksMap.set(userId, tasks[i])
                }
            }
        }

        const profiles = await this.batchGetProfiles(userIds)
        const complexTasks : any[] = []

        for (let i = 0; i < tasks.length; i++) {
            const profile = profiles.get(tasks[i].userId)
            complexTasks.push({
                ...tasks[i],
                name: profile.name,
                location: profile.location,
                profilePhoto: ( profile.photos ?
                    profile.photos[0]: undefined)
            })
        }

        return complexTasks
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
        if(!task || !task.applicants){
            return []
        }
        let userIds = []
        let applicants = []

        if (task && task.applicants && task.userId === params.userId) {
            applicants = task.applicants
            for (let i = 0; i < task.applicants.length; i++) {
                userIds.push({accountId: task.applicants[i].userId})
            }
        }

        const profiles = await this.batchGetProfiles(userIds)
        const applicantProfiles : ApplicantProfile[] = []

        for (let i = 0; i < applicants.length; i++) {
            const profile = profiles.get(applicants[i].userId)
            const ap : ApplicantProfile = {
                userId: applicants[i].userId,
                applicant: applicants[i],
                name: ( profile && profile.name ?
                    profile.name: ''),
                location: ( profile ?
                    profile.location: undefined),
                profilePhoto: ( profile && profile.photos ?
                    profile.photos[0]: undefined)
            }
            applicantProfiles.push(ap)
        }
        return applicantProfiles
    }

    async batchGetProfiles(userIds: any): Promise<any> {
        const requestItems: any = {}
        let profiles = new Map<string, any>()
        if (userIds.length === 0 ){
            return profiles
        }

        requestItems[this.props.profileTable] = {
            Keys: userIds
        }
        const userResponse = await this.documentClient
            .batchGet({
                RequestItems: requestItems
            }).promise()
        let rawProfiles: any = []
        if(userResponse && userResponse.Responses && userResponse.Responses[this.props.profileTable]){
            rawProfiles = userResponse.Responses[this.props.profileTable]
            for(let i=0; i< rawProfiles.length; i++){
                profiles.set(rawProfiles[i].userId, rawProfiles[i])
            }
        }
        return profiles
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
